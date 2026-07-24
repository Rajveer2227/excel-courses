import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT 
        id,
        title,
        COALESCE(file_type, 'pdf') as "fileType",
        COALESCE(course_ids, '{}') as "courseIds",
        category,
        file_size as "fileSize",
        upload_date as "uploadDate",
        is_favorite as "isFavorite",
        COALESCE(preview_url, url, blob_url, '') as "previewUrl",
        COALESCE(blob_url, url, preview_url, '') as "blobUrl"
      FROM media_items
      WHERE is_active = TRUE OR is_active IS NULL
      ORDER BY created_at DESC;
    `;

    return res.status(200).json({
      success: true,
      mediaItems: rows
    });
  } catch (err: any) {
    console.error('[API /api/media] Fetch Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch media items from Neon database',
      details: err.message
    });
  }
}
