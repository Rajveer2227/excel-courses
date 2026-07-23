import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkDatabaseHealth, initializeSchema } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });
  }

  // Debug logging for environment variable presence (without revealing secret value)
  console.log({
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    envKeys: Object.keys(process.env).filter(k => k.includes("DATABASE"))
  });

  try {
    const health = await checkDatabaseHealth();

    if (!health.success) {
      return res.status(500).json({
        success: false,
        database: 'disconnected',
        error: health.error || 'Failed to connect to Neon PostgreSQL'
      });
    }

    // Optionally initialize schema if query parameter init=true is passed
    if (req.query?.init === 'true') {
      const initResult = await initializeSchema();
      return res.status(200).json({
        success: true,
        database: 'connected',
        timestamp: health.timestamp,
        schemaInit: initResult
      });
    }

    return res.status(200).json({
      success: true,
      database: 'connected'
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({
      success: false,
      database: 'disconnected',
      error: errorMsg
    });
  }
}
