import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCampaignStatsFromDb } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        message: 'Method Not Allowed',
        error: 'Only GET supported',
        timestamp: new Date().toISOString()
      });
    }

    const stats = await getCampaignStatsFromDb();
    return res.status(200).json({
      success: true,
      message: 'Campaign stats fetched successfully',
      data: stats,
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
