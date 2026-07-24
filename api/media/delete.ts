import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del, type DeleteCommandOptions } from '@vercel/blob';
import { getDb } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mediaId } = req.body || {};

    if (!mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter "mediaId"'
      });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT id, blob_url, preview_url, url 
      FROM media_items 
      WHERE id = ${mediaId} 
      LIMIT 1;
    `;

    if (rows.length > 0) {
      const blobUrl = rows[0].blob_url || rows[0].preview_url || rows[0].url;
      const blobAuthOptions = {
        ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}),
        ...(process.env.VERCEL_OIDC_TOKEN ? { oidcToken: process.env.VERCEL_OIDC_TOKEN } : {}),
        ...(process.env.BLOB_STORE_ID ? { storeId: process.env.BLOB_STORE_ID } : {})
      };

      if (blobUrl && blobUrl.includes('vercel-storage.com')) {
        try {
          await del(blobUrl, blobAuthOptions as DeleteCommandOptions);
          console.log(`Deleted Blob object: ${blobUrl}`);
        } catch (delErr: any) {
          console.warn(`Could not delete Blob object (ignoring): ${delErr.message}`);
        }
      }

      // Hard delete or soft delete
      await sql`
        DELETE FROM media_items WHERE id = ${mediaId};
      `;
    }

    console.log(`[API /api/media/delete] Successfully deleted media item ${mediaId}`);

    return res.status(200).json({
      success: true,
      mediaId
    });
  } catch (err: any) {
    console.error('[API /api/media/delete] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete media item'
    });
  }
}
