import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCampaignsFromDb,
  getCampaignByIdFromDb,
  getCampaignStatsFromDb,
  createCampaignInDb,
  updateCampaignInDb,
  deleteCampaignInDb,
  archiveCampaignInDb,
  duplicateCampaignInDb,
  scheduleCampaignInDb,
  unscheduleCampaignInDb
} from './lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = (req.query.action as string) || (req.body?.action as string);
  const id = (req.query.id as string) || (req.body?.id as string);

  try {
    // ----------------------------------------------------
    // GET OPERATIONS
    // ----------------------------------------------------
    if (req.method === 'GET') {
      // 1. Stats endpoint
      if (action === 'stats') {
        const stats = await getCampaignStatsFromDb();
        return res.status(200).json({
          success: true,
          message: 'Campaign stats fetched successfully',
          data: stats,
          timestamp: new Date().toISOString()
        });
      }

      // 2. Fetch campaign by ID
      if (id) {
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

      // 3. List campaigns with search, status, tag, pagination
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

    // ----------------------------------------------------
    // POST OPERATIONS (action routing)
    // ----------------------------------------------------
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      // Archive action
      if (action === 'archive') {
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Campaign ID is required',
            error: 'MISSING_CAMPAIGN_ID',
            timestamp: new Date().toISOString()
          });
        }
        const isArchivedParam = body.isArchived !== undefined ? Boolean(body.isArchived) : undefined;
        const result = await archiveCampaignInDb(id, isArchivedParam);
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
      }

      // Duplicate action
      if (action === 'duplicate') {
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Campaign ID is required',
            error: 'MISSING_CAMPAIGN_ID',
            timestamp: new Date().toISOString()
          });
        }
        const duplicated = await duplicateCampaignInDb(id);
        if (!duplicated) {
          return res.status(404).json({
            success: false,
            message: 'Original campaign not found',
            error: 'NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }
        return res.status(201).json({
          success: true,
          message: 'Campaign duplicated successfully',
          data: duplicated,
          timestamp: new Date().toISOString()
        });
      }

      // Schedule action
      if (action === 'schedule') {
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Campaign ID is required',
            error: 'MISSING_CAMPAIGN_ID',
            timestamp: new Date().toISOString()
          });
        }
        if (!body.scheduledDate || !body.scheduledTime) {
          return res.status(400).json({
            success: false,
            message: 'Scheduled date and time are required',
            error: 'INVALID_SCHEDULE_PAYLOAD',
            timestamp: new Date().toISOString()
          });
        }
        const scheduled = await scheduleCampaignInDb(id, body);
        if (!scheduled) {
          return res.status(404).json({
            success: false,
            message: 'Campaign not found for scheduling',
            error: 'NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Campaign scheduled successfully',
          data: scheduled,
          timestamp: new Date().toISOString()
        });
      }

      // Delete action via POST
      if (action === 'delete') {
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Campaign ID is required',
            error: 'MISSING_CAMPAIGN_ID',
            timestamp: new Date().toISOString()
          });
        }
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

      // Update action via POST
      if (action === 'update' && id) {
        let result = await updateCampaignInDb(id, body);
        if (!result) {
          result = await createCampaignInDb({ ...body, id });
        }
        return res.status(200).json({
          success: true,
          message: 'Campaign saved successfully',
          data: result,
          timestamp: new Date().toISOString()
        });
      }

      // Create action (default POST)
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

    // ----------------------------------------------------
    // PUT: Upsert Campaign
    // ----------------------------------------------------
    if (req.method === 'PUT') {
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
          error: 'MISSING_CAMPAIGN_ID',
          timestamp: new Date().toISOString()
        });
      }

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      let result = await updateCampaignInDb(id, body);
      if (!result) {
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

    // ----------------------------------------------------
    // DELETE: Delete Campaign or Unschedule
    // ----------------------------------------------------
    if (req.method === 'DELETE') {
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Campaign ID is required',
          error: 'MISSING_CAMPAIGN_ID',
          timestamp: new Date().toISOString()
        });
      }

      if (action === 'schedule') {
        const unscheduled = await unscheduleCampaignInDb(id);
        if (!unscheduled) {
          return res.status(404).json({
            success: false,
            message: 'Campaign not found for unscheduling',
            error: 'NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Campaign unscheduled successfully',
          data: unscheduled,
          timestamp: new Date().toISOString()
        });
      }

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

    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed',
      error: `Method ${req.method} is not supported`,
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
