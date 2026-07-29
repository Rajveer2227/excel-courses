import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppSettingFromDb, setAppSettingInDb } from './lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const key = (req.query.key as string) || 'swift_share_delivery_mode';
      const defaultValue = (req.query.defaultValue as string) || 'cost_optimized';
      const value = await getAppSettingFromDb(key, defaultValue);

      return res.status(200).json({
        success: true,
        key,
        value,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      const key = req.body?.key || 'swift_share_delivery_mode';
      const value = req.body?.value;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Setting value is required'
        });
      }

      const result = await setAppSettingInDb(key, value);
      return res.status(200).json({
        success: true,
        key,
        value: result.value,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown settings API error';
    return res.status(500).json({
      success: false,
      error: errorMsg
    });
  }
}
