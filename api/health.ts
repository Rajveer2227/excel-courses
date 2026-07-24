import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWhatsAppHealthStatus, logStartupHealthCheck } from './lib/whatsappConfig.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} Not Allowed`,
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  logStartupHealthCheck();
  const healthStatus = getWhatsAppHealthStatus();

  return res.status(200).json(healthStatus);
}
