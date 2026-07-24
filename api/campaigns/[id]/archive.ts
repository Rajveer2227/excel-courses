import type { VercelRequest, VercelResponse } from '@vercel/node';
import { archiveCampaignInDb } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Method Not Allowed',
        error: 'Only POST supported',
        timestamp: new Date().toISOString()
      });
    }

    const id = (req.query.id as string) || (req.query['[id]'] as string);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID is required',
        error: 'MISSING_CAMPAIGN_ID',
        timestamp: new Date().toISOString()
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const isArchived = body.isArchived !== undefined ? Boolean(body.isArchived) : undefined;

    const result = await archiveCampaignInDb(id, isArchived);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
        error: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: result.isArchived ? 'Campaign archived' : 'Campaign restored',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({
      success: false,
      message,
      error: message,
      timestamp: new Date().toISOString()
    });
  }
}
