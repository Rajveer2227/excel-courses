import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, type PutCommandOptions } from '@vercel/blob';
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
    const { title, fileType, category, fileSize, courseIds, fileData, fileName } = req.body || {};

    if (!title || !fileData || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters (title, fileName, fileData)'
      });
    }

    // Security MIME / extension validation
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'mp4'];
    if (!allowed.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: `Security Violation: File extension ".${ext}" is not permitted. Only PDF, PNG, JPG, WEBP, and MP4 files are allowed.`
      });
    }

    // Convert base64 data to buffer if needed
    let buffer: Buffer;
    if (typeof fileData === 'string' && fileData.includes('base64,')) {
      const base64Str = fileData.split('base64,')[1];
      buffer = Buffer.from(base64Str, 'base64');
    } else if (typeof fileData === 'string') {
      buffer = Buffer.from(fileData, 'base64');
    } else {
      buffer = Buffer.from(fileData);
    }

    // 1. Upload file directly to Vercel Blob Storage using official OIDC / Token auth
    const safeFileName = `materials/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const blobOptions: PutCommandOptions = {
      access: 'public',
      addRandomSuffix: false,
      ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}),
      ...(process.env.VERCEL_OIDC_TOKEN ? { oidcToken: process.env.VERCEL_OIDC_TOKEN } : {}),
      ...(process.env.BLOB_STORE_ID ? { storeId: process.env.BLOB_STORE_ID } : {})
    };

    const blob = await put(safeFileName, buffer, blobOptions);

    const mediaId = `media-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const categoryName = category || 'Syllabus';
    const type = fileType || (ext === 'pdf' ? 'pdf' : ext === 'mp4' ? 'video' : 'image');
    const coursesArr = Array.isArray(courseIds) ? courseIds : ['ALL'];
    const formattedSize = fileSize || `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`;

    // 2. Save metadata in Neon PostgreSQL database
    const sql = getDb();
    await sql`
      INSERT INTO media_items (
        id,
        title,
        file_name,
        file_type,
        category,
        file_size,
        upload_date,
        is_favorite,
        preview_url,
        blob_url,
        blob_pathname,
        mime_type,
        course_ids,
        is_active
      ) VALUES (
        ${mediaId},
        ${title},
        ${fileName || title},
        ${type},
        ${categoryName},
        ${formattedSize},
        ${today},
        FALSE,
        ${blob.url},
        ${blob.url},
        ${blob.pathname},
        ${blob.contentType || 'application/pdf'},
        ${coursesArr},
        TRUE
      );
    `;

    const newItem = {
      id: mediaId,
      title,
      fileType: type,
      category: categoryName,
      fileSize: formattedSize,
      uploadDate: today,
      isFavorite: false,
      previewUrl: blob.url,
      blobUrl: blob.url,
      courseIds: coursesArr
    };

    console.log(`[API /api/media/upload] Successfully uploaded to Vercel Blob and saved in Neon:`, mediaId);

    return res.status(200).json({
      success: true,
      mediaItem: newItem
    });
  } catch (err: any) {
    console.error('[API /api/media/upload] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to upload media to Vercel Blob'
    });
  }
}
