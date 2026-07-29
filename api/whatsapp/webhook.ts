import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWhatsAppConfig } from '../lib/whatsappConfig.js';
import { shouldSendAutoReply, recordAutoReplySent } from '../lib/db.js';

export const AUTO_REPLY_TEXT = `Hello!

This WhatsApp number is only for sharing course information.

For any enquiry, call +91 9156012360`;

/**
 * Meta WhatsApp Cloud API Webhook Handler
 * - GET: Verification Challenge Handshake (hub.verify_token, hub.challenge)
 * - POST: Incoming Customer Messages -> One-Time Auto Reply per 24-hour Window
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. GET: Webhook Verification Handshake
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'excel_computers_whatsapp_token';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WhatsApp Webhook] Handshake verified successfully.');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification token mismatch' });
  }

  // 2. POST: Inbound Message Handling & Idempotent One-Time Auto Reply
  if (req.method === 'POST') {
    // Immediately respond HTTP 200 to Meta to acknowledge event & prevent webhook retries
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    const body = req.body;
    if (body?.object === 'whatsapp_business_account' && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            const value = change.value;
            if (value?.messages && Array.isArray(value.messages)) {
              for (const msg of value.messages) {
                const fromPhone = msg.from; // Sender phone digits
                const msgId = msg.id;

                if (!fromPhone) continue;

                // Check 24-hour window & duplicate event status
                const check = await shouldSendAutoReply(fromPhone, msgId);
                if (!check.shouldSend) {
                  console.log(`[AutoReply] Suppressing duplicate/subsequent auto reply for ${fromPhone}: ${check.reason}`);
                  continue;
                }

                // Transmit guidance text message via Meta WhatsApp Cloud API
                try {
                  const config = getWhatsAppConfig();
                  if (!config.accessToken || !config.phoneNumberId) {
                    console.warn(`[AutoReply] Server credentials unconfigured. Recording auto-reply state for ${fromPhone}.`);
                    await recordAutoReplySent(fromPhone, msgId);
                    continue;
                  }

                  const targetDigits = fromPhone.replace(/\D/g, '');
                  const payload = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: targetDigits,
                    type: 'text',
                    text: {
                      preview_url: false,
                      body: AUTO_REPLY_TEXT
                    }
                  };

                  const graphRes = await fetch(config.graphApiBaseUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${config.accessToken}`
                    },
                    body: JSON.stringify(payload)
                  });

                  if (graphRes.ok) {
                    console.log(`[AutoReply] One-time guidance auto-reply successfully sent to ${fromPhone}`);
                    await recordAutoReplySent(fromPhone, msgId);
                  } else {
                    const errJson = await graphRes.json().catch(() => ({}));
                    console.error(`[AutoReply] Meta Cloud API error sending to ${fromPhone}:`, errJson);
                  }
                } catch (err) {
                  console.error(`[AutoReply] Exception sending auto-reply to ${fromPhone}:`, err);
                }
              }
            }
          }
        }
      }
    }
    return;
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
