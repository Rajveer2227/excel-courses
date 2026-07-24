import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, del, type PutCommandOptions, type DeleteCommandOptions } from '@vercel/blob';
import { getDb } from '../lib/db.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mediaId, title, fileData, fileName } = req.body || {};

    if (!mediaId || !fileData || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters (mediaId, fileName, fileData)'
      });
    }

    const sql = getDb();
    const existing = await sql`
      SELECT id, blob_url, preview_url, url 
      FROM media_items 
      WHERE id = ${mediaId} 
      LIMIT 1;
    `;

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Media item with ID "${mediaId}" not found in database.`
      });
    }

    const oldBlobUrl = existing[0].blob_url || existing[0].preview_url || existing[0].url;

    // Security MIME / extension validation
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'mp4'];
    if (!allowed.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: `Security Violation: Extension ".${ext}" is not permitted.`
      });
    }

    // Buffer conversion
    let buffer: Buffer;
    if (typeof fileData === 'string' && fileData.includes('base64,')) {
      buffer = Buffer.from(fileData.split('base64,')[1], 'base64');
    } else if (typeof fileData === 'string') {
      buffer = Buffer.from(fileData, 'base64');
    } else {
      buffer = Buffer.from(fileData);
    }

    const blobAuthOptions = {
      ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}),
      ...(process.env.VERCEL_OIDC_TOKEN ? { oidcToken: process.env.VERCEL_OIDC_TOKEN } : {}),
      ...(process.env.BLOB_STORE_ID ? { storeId: process.env.BLOB_STORE_ID } : {})
    };

    // 1. Delete previous Blob object if it's a Vercel Blob URL
    if (oldBlobUrl && oldBlobUrl.includes('vercel-storage.com')) {
      try {
        await del(oldBlobUrl, blobAuthOptions as DeleteCommandOptions);
        console.log(`Deleted old blob: ${oldBlobUrl}`);
      } catch (delErr: any) {
        console.warn(`Could not delete old blob (ignoring): ${delErr.message}`);
      }
    }

    // 2. Upload new Blob file
    const safeFileName = `materials/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const newBlobOptions: PutCommandOptions = {
      access: 'public',
      addRandomSuffix: false,
      ...blobAuthOptions
    };
    const newBlob = await put(safeFileName, buffer, newBlobOptions);

    const formattedSize = `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`;
    const today = new Date().toISOString().split('T')[0];

    // 3. Update database record maintaining the exact same ID
    await sql`
      UPDATE media_items
      SET 
        title = COALESCE(${title}, title),
        blob_url = ${newBlob.url},
        preview_url = ${newBlob.url},
        blob_pathname = ${newBlob.pathname},
        file_size = ${formattedSize},
        upload_date = ${today},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${mediaId};
    `;

    console.log(`[API /api/media/replace] Replaced media record ${mediaId} with new Blob URL ${newBlob.url}`);

    return res.status(200).json({
      success: true,
      mediaItem: {
        id: mediaId,
        title: title || existing[0].title,
        previewUrl: newBlob.url,
        blobUrl: newBlob.url,
        fileSize: formattedSize,
        uploadDate: today
      }
    });
  } catch (err: any) {
    console.error('[API /api/media/replace] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to replace media in Vercel Blob'
    });
  }
}
