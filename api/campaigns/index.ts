import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCampaignsFromDb,
  createCampaignInDb
} from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const search = req.query.search as string;
        const status = req.query.status as string;
        const tag = req.query.tag as string;
        const isArchived = req.query.isArchived === 'true';
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
        const sort = req.query.sort as string;

        const result = await getCampaignsFromDb({
          search,
          status,
          tag,
          isArchived,
          page,
          limit,
          sort
        });

        return res.status(200).json(result);
      }

      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        // Backend Validation
        if (!body.campaignName || typeof body.campaignName !== 'string' || !body.campaignName.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Campaign name is required',
            error: 'MISSING_CAMPAIGN_NAME',
            timestamp: new Date().toISOString()
          });
        }

        const newCampaign = await createCampaignInDb(body);
        return res.status(201).json({
          success: true,
          message: 'Campaign created successfully',
          data: newCampaign,
          timestamp: new Date().toISOString()
        });
      }

      default:
        return res.status(405).json({
          success: false,
          message: 'Method Not Allowed',
          error: `Method ${req.method} is not supported on /api/campaigns`,
          timestamp: new Date().toISOString()
        });
    }
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
