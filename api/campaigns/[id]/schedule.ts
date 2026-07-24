import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scheduleCampaignInDb, unscheduleCampaignInDb } from '../../lib/db.js';

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

    if (req.method === 'DELETE') {
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

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Method Not Allowed',
        error: 'Only POST and DELETE supported',
        timestamp: new Date().toISOString()
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // Backend Validation
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
