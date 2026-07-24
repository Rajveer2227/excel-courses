import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCampaignByIdFromDb,
  updateCampaignInDb,
  createCampaignInDb,
  deleteCampaignInDb
} from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = (req.query.id as string) || (req.query['[id]'] as string);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID is required',
        error: 'MISSING_CAMPAIGN_ID',
        timestamp: new Date().toISOString()
      });
    }

    switch (req.method) {
      case 'GET': {
        const campaign = await getCampaignByIdFromDb(id);
        if (!campaign) {
          return res.status(404).json({
            success: false,
            message: 'Campaign not found',
            error: 'NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Campaign fetched successfully',
          data: campaign,
          timestamp: new Date().toISOString()
        });
      }

      case 'PUT': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        // Upsert: try update first, fall back to create if not found
        let result = await updateCampaignInDb(id, body);
        if (!result) {
          // Campaign doesn't exist yet — create it with the provided ID
          result = await createCampaignInDb({ ...body, id });
        }

        if (!result) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upsert campaign',
            error: 'UPSERT_FAILED',
            timestamp: new Date().toISOString()
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Campaign saved successfully',
          data: result,
          timestamp: new Date().toISOString()
        });
      }

      case 'DELETE': {
        const deleted = await deleteCampaignInDb(id);
        if (!deleted) {
          return res.status(404).json({
            success: false,
            message: 'Campaign not found for deletion',
            error: 'NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Campaign soft-deleted successfully',
          data: { id },
          timestamp: new Date().toISOString()
        });
      }

      default:
        return res.status(405).json({
          success: false,
          message: 'Method Not Allowed',
          error: `Method ${req.method} is not supported`,
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
