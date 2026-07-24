import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWhatsAppConfig, validateWhatsAppConfig, logStartupHealthCheck } from '../lib/whatsappConfig.js';

export interface WhatsAppSendRequestBody {
  action: 'sendText' | 'sendDocument' | 'sendImage' | 'sendVideo';
  toE164: string;
  text?: string;
  mediaUrl?: string;
  filename?: string;
  caption?: string;
  idempotencyKey?: string;
  dispatchId?: string;
}

// In-Memory Idempotency Cache (5-minute TTL to prevent double dispatches)
const idempotencyCache = new Map<string, { response: any; timestamp: number }>();

function cleanExpiredIdempotencyKeys() {
  const now = Date.now();
  const ttl = 5 * 60 * 1000;
  for (const [key, val] of idempotencyCache.entries()) {
    if (now - val.timestamp > ttl) {
      idempotencyCache.delete(key);
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  cleanExpiredIdempotencyKeys();
  logStartupHealthCheck();

  // 1. HTTP Method Restriction
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} Not Allowed`,
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // 2. Parse & Validate Request Body
  const body: WhatsAppSendRequestBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { action, toE164, text, mediaUrl, filename, caption, idempotencyKey, dispatchId } = body;
  const correlationId = dispatchId || `disp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Idempotency Protection Check
  if (idempotencyKey && idempotencyKey.trim()) {
    const cached = idempotencyCache.get(idempotencyKey.trim());
    if (cached) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        dispatchId: correlationId,
        idempotencyKey,
        action,
        recipient: toE164,
        status: 'IDEMPOTENT_CACHE_HIT',
        message: 'Returned cached response for duplicate idempotency key'
      }));
      return res.status(200).json({
        ...cached.response,
        cached: true,
        idempotencyKey
      });
    }
  }

  if (!action || !['sendText', 'sendDocument', 'sendImage', 'sendVideo'].includes(action)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing action. Must be sendText, sendDocument, sendImage, or sendVideo.',
      code: 'INVALID_ACTION',
      dispatchId: correlationId
    });
  }

  // E.164 Phone Validation (+ followed by 10-15 digits)
  const cleanPhone = (toE164 || '').trim();
  if (!cleanPhone || !/^\+\d{10,15}$/.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      error: `Invalid E.164 phone format: "${toE164}". Expected format: +919823045678`,
      code: 'INVALID_PHONE_NUMBER',
      dispatchId: correlationId
    });
  }

  // Action-specific payload validations
  if (action === 'sendText') {
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required for sendText action.',
        code: 'MISSING_TEXT_MESSAGE',
        dispatchId: correlationId
      });
    }
  } else {
    if (!mediaUrl || !mediaUrl.trim()) {
      return res.status(400).json({
        success: false,
        error: `Media URL is required for ${action} action.`,
        code: 'MISSING_MEDIA_URL',
        dispatchId: correlationId
      });
    }

    if (!/^https?:\/\//i.test(mediaUrl.trim())) {
      return res.status(400).json({
        success: false,
        error: `Media URL must be a valid public HTTP/HTTPS URL. Received: "${mediaUrl}"`,
        code: 'INVALID_MEDIA_URL',
        dispatchId: correlationId
      });
    }
  }

  // 3. Server Configuration & Environment Credential Validation
  const validation = validateWhatsAppConfig();
  const config = getWhatsAppConfig();

  if (!validation.isValid) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      dispatchId: correlationId,
      status: 'CREDENTIALS_UNCONFIGURED',
      errors: validation.errors
    }));
    return res.status(503).json({
      success: false,
      error: 'Meta WhatsApp Business Cloud API environment credentials are not configured on server.',
      details: validation.errors,
      code: 'CREDENTIALS_NOT_CONFIGURED',
      dispatchId: correlationId
    });
  }

  // 4. Construct Meta Graph API Payload
  let metaPayload: Record<string, any>;

  const targetRecipientDigits = cleanPhone.replace(/\D/g, '');

  if (action === 'sendText') {
    metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetRecipientDigits,
      type: 'text',
      text: {
        preview_url: false,
        body: text!.trim()
      }
    };
  } else if (action === 'sendDocument') {
    metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetRecipientDigits,
      type: 'document',
      document: {
        link: mediaUrl!.trim(),
        filename: filename?.trim() || 'Course Material Document.pdf',
        caption: caption?.trim() || filename?.trim() || undefined
      }
    };
  } else if (action === 'sendImage') {
    metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetRecipientDigits,
      type: 'image',
      image: {
        link: mediaUrl!.trim(),
        caption: caption?.trim() || undefined
      }
    };
  } else {
    metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetRecipientDigits,
      type: 'video',
      video: {
        link: mediaUrl!.trim(),
        caption: caption?.trim() || undefined
      }
    };
  }

  // 5. Execute Outbound Meta Cloud API Request with 25-second Timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const metaRes = await fetch(config.graphApiBaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const json: any = await metaRes.json().catch(() => ({}));

    // 6. Structured JSON Logging & Idempotency Cache Store
    if (metaRes.ok && json.messages && json.messages[0]?.id) {
      const messageId = json.messages[0].id;

      const successResponse = {
        success: true,
        messageId,
        dispatchId: correlationId,
        durationMs,
        provider: 'Meta WhatsApp Cloud API',
        metaResponseBody: json
      };

      if (idempotencyKey && idempotencyKey.trim()) {
        idempotencyCache.set(idempotencyKey.trim(), {
          response: successResponse,
          timestamp: Date.now()
        });
      }

      // Log complete Graph API response body (excluding secrets) for full diagnostic auditing
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        dispatchId: correlationId,
        action,
        recipient: targetRecipientDigits,
        httpStatus: metaRes.status,
        durationMs,
        wamid: messageId,
        metaResponseBody: json,
        success: true
      }, null, 2));

      return res.status(200).json(successResponse);
    }

    // Handle Meta Error Responses
    const statusCode = metaRes.status;
    const metaErrorMsg = json.error?.message || json.error?.error_data?.details || 'Meta API returned an error response';
    const metaErrorCode = json.error?.code;

    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      dispatchId: correlationId,
      action,
      recipient: cleanPhone,
      httpStatus: statusCode,
      durationMs,
      metaErrorCode,
      error: metaErrorMsg,
      success: false
    }));

    if (statusCode === 401 || statusCode === 403) {
      return res.status(statusCode).json({
        success: false,
        error: 'Authentication failure with Meta WhatsApp Cloud API. Please verify WHATSAPP_ACCESS_TOKEN.',
        code: 'META_AUTH_ERROR',
        statusCode,
        dispatchId: correlationId
      });
    }

    if (statusCode === 429) {
      return res.status(429).json({
        success: false,
        error: 'Meta Cloud API rate limit exceeded. Please backoff and retry later.',
        code: 'META_RATE_LIMIT',
        statusCode,
        metaError: json.error,
        dispatchId: correlationId
      });
    }

    if (statusCode >= 400 && statusCode < 500) {
      return res.status(400).json({
        success: false,
        error: `Meta API Request Error: ${metaErrorMsg}`,
        code: 'META_REQUEST_ERROR',
        statusCode,
        metaError: json.error,
        dispatchId: correlationId
      });
    }

    return res.status(502).json({
      success: false,
      error: `Meta API Gateway Error: ${metaErrorMsg}`,
      code: 'META_GATEWAY_ERROR',
      statusCode,
      metaError: json.error,
      dispatchId: correlationId
    });

  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (err.name === 'AbortError') {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        dispatchId: correlationId,
        action,
        recipient: cleanPhone,
        error: 'Request timeout after 25s',
        durationMs
      }));
      return res.status(504).json({
        success: false,
        error: 'Outbound request to Meta WhatsApp Cloud API timed out after 25 seconds.',
        code: 'REQUEST_TIMEOUT',
        durationMs,
        dispatchId: correlationId
      });
    }

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      dispatchId: correlationId,
      action,
      recipient: cleanPhone,
      error: err.message || err,
      durationMs
    }));

    return res.status(500).json({
      success: false,
      error: err.message || 'Internal gateway error during Meta Cloud API dispatch',
      code: 'INTERNAL_SERVER_ERROR',
      durationMs,
      dispatchId: correlationId
    });
  }
}
