import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, del, type PutCommandOptions, type DeleteCommandOptions } from '@vercel/blob';
import { getDb, updateMediaItemInDb } from './lib/db.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  const action = (req.query.action as string) || (req.body?.action as string);

  try {
    // ----------------------------------------------------
    // GET: List all media items or fetch single by ID
    // ----------------------------------------------------
    if (req.method === 'GET') {
      const id = (req.query.id as string) || (req.query.mediaId as string);

      if (id) {
        const rows = await sql`
          SELECT 
            id,
            title,
            file_name as "fileName",
            COALESCE(file_type, 'pdf') as "fileType",
            COALESCE(course_ids, '{}') as "courseIds",
            category,
            file_size as "fileSize",
            upload_date as "uploadDate",
            is_favorite as "isFavorite",
            COALESCE(preview_url, url, blob_url, '') as "previewUrl",
            COALESCE(blob_url, url, preview_url, '') as "blobUrl"
          FROM media_items
          WHERE id = ${id} AND (is_active = TRUE OR is_active IS NULL)
          LIMIT 1;
        `;
        if (rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Media item not found' });
        }
        return res.status(200).json({ success: true, mediaItem: rows[0] });
      }

      const rows = await sql`
        SELECT 
          id,
          title,
          file_name as "fileName",
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
    }

    // ----------------------------------------------------
    // SEED: Action === 'seed'
    // ----------------------------------------------------
    if (action === 'seed') {
      const countRes = await sql`SELECT COUNT(*) FROM media_items;`;
      const count = parseInt(countRes[0].count, 10);

      if (count > 0) {
        return res.status(200).json({
          success: true,
          message: `Database already seeded with ${count} media items.`,
          count
        });
      }

      const seedItems = [
        {
          id: 'media-1',
          title: 'C Programming Complete Syllabus',
          file_type: 'pdf',
          category: 'Syllabus',
          file_size: '1.4 MB',
          upload_date: '2026-07-15',
          is_favorite: true,
          blob_url: 'https://courses.excelcomputers.info/assets/materials/c-programming.pdf',
          course_ids: ['c-programming']
        },
        {
          id: 'media-2',
          title: 'Full Stack Python Course Overview & Curriculum',
          file_type: 'pdf',
          category: 'Syllabus',
          file_size: '2.8 MB',
          upload_date: '2026-07-18',
          is_favorite: true,
          blob_url: 'https://courses.excelcomputers.info/assets/materials/full-stack-python.pdf',
          course_ids: ['full-stack-python']
        },
        {
          id: 'media-3',
          title: 'Excel Computers General Admission Brochure 2026',
          file_type: 'pdf',
          category: 'Brochure',
          file_size: '4.5 MB',
          upload_date: '2026-07-01',
          is_favorite: true,
          blob_url: 'https://courses.excelcomputers.info/assets/materials/excel-computers-brochure-2026.pdf',
          course_ids: ['ALL']
        },
        {
          id: 'media-4',
          title: 'Data Analytics & Power BI Course Syllabus',
          file_type: 'pdf',
          category: 'Syllabus',
          file_size: '2.1 MB',
          upload_date: '2026-07-10',
          is_favorite: false,
          blob_url: 'https://courses.excelcomputers.info/assets/materials/data-analytics-powerbi.pdf',
          course_ids: ['data-analytics-powerbi']
        },
        {
          id: 'media-5',
          title: 'C++ Programming Fast-Track Flyer',
          file_type: 'pdf',
          category: 'Flyer',
          file_size: '850 KB',
          upload_date: '2026-07-12',
          is_favorite: false,
          blob_url: 'https://courses.excelcomputers.info/assets/materials/cpp-programming.pdf',
          course_ids: ['cpp-programming']
        },
        {
          id: 'media-6',
          title: 'Full Stack Web Development (MERN) Syllabus',
          file_type: 'pdf',
          category: 'Syllabus',
          file_size: '3.1 MB',
          upload_date: '2026-07-05',
          is_favorite: false,
          blob_url: 'https://courses.excelcomputers.info/assets/materials/full-stack-web-development-mern.pdf',
          course_ids: ['full-stack-web-development-mern']
        },
        {
          id: 'media-7',
          title: 'AI & Machine Learning Internship Special Flyer',
          file_type: 'pdf',
          category: 'Flyer',
          file_size: '1.1 MB',
          upload_date: '2026-07-19',
          is_favorite: true,
          blob_url: 'https://courses.excelcomputers.info/assets/materials/ai-machine-learning.pdf',
          course_ids: ['ai-machine-learning']
        },
        {
          id: 'media-8',
          title: 'Tally Prime + GST Accounting Fee Structure & Offer',
          file_type: 'pdf',
          category: 'Brochure',
          file_size: '920 KB',
          upload_date: '2026-07-14',
          is_favorite: false,
          blob_url: 'https://courses.excelcomputers.info/assets/materials/tally-prime-gst.pdf',
          course_ids: ['tally-prime-gst']
        }
      ];

      for (const item of seedItems) {
        await sql`
          INSERT INTO media_items (
            id, title, file_name, file_type, category, file_size, upload_date, is_favorite, preview_url, blob_url, course_ids, is_active
          ) VALUES (
            ${item.id}, ${item.title}, ${item.title}, ${item.file_type}, ${item.category}, ${item.file_size}, ${item.upload_date}, ${item.is_favorite}, ${item.blob_url}, ${item.blob_url}, ${item.course_ids}, TRUE
          )
          ON CONFLICT (id) DO UPDATE SET
            file_name = EXCLUDED.file_name,
            blob_url = EXCLUDED.blob_url,
            preview_url = EXCLUDED.preview_url;
        `;
      }

      return res.status(200).json({
        success: true,
        message: 'Seeded initial media items into Neon PostgreSQL',
        count: seedItems.length
      });
    }

    // Shared Blob auth options helper
    const blobAuthOptions = {
      ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}),
      ...(process.env.VERCEL_OIDC_TOKEN ? { oidcToken: process.env.VERCEL_OIDC_TOKEN } : {}),
      ...(process.env.BLOB_STORE_ID ? { storeId: process.env.BLOB_STORE_ID } : {})
    };

    // ----------------------------------------------------
    // REPLACE: Action === 'replace'
    // ----------------------------------------------------
    if (action === 'replace') {
      const { mediaId, title, fileData, fileName } = req.body || {};

      if (!mediaId || !fileData || !fileName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters (mediaId, fileName, fileData)'
        });
      }

      const existing = await sql`
        SELECT id, title, blob_url, preview_url, url 
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

      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'mp4'];
      if (!allowed.includes(ext)) {
        return res.status(400).json({
          success: false,
          error: `Security Violation: Extension ".${ext}" is not permitted.`
        });
      }

      let buffer: Buffer;
      if (typeof fileData === 'string' && fileData.includes('base64,')) {
        buffer = Buffer.from(fileData.split('base64,')[1], 'base64');
      } else if (typeof fileData === 'string') {
        buffer = Buffer.from(fileData, 'base64');
      } else {
        buffer = Buffer.from(fileData);
      }

      if (oldBlobUrl && oldBlobUrl.includes('vercel-storage.com')) {
        try {
          await del(oldBlobUrl, blobAuthOptions as DeleteCommandOptions);
          console.log(`Deleted old blob: ${oldBlobUrl}`);
        } catch (delErr: any) {
          console.warn(`Could not delete old blob (ignoring): ${delErr.message}`);
        }
      }

      const safeFileName = `materials/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const newBlobOptions: PutCommandOptions = {
        access: 'public',
        addRandomSuffix: false,
        ...blobAuthOptions
      };
      const newBlob = await put(safeFileName, buffer, newBlobOptions);

      const formattedSize = `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`;
      const today = new Date().toISOString().split('T')[0];

      await sql`
        UPDATE media_items
        SET 
          title = COALESCE(${title}, title),
          file_name = ${fileName},
          blob_url = ${newBlob.url},
          preview_url = ${newBlob.url},
          blob_pathname = ${newBlob.pathname},
          file_size = ${formattedSize},
          upload_date = ${today},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${mediaId};
      `;

      return res.status(200).json({
        success: true,
        mediaItem: {
          id: mediaId,
          title: title || existing[0].title,
          fileName,
          previewUrl: newBlob.url,
          blobUrl: newBlob.url,
          fileSize: formattedSize,
          uploadDate: today
        }
      });
    }

    // ----------------------------------------------------
    // DELETE: Action === 'delete' OR Method === 'DELETE'
    // ----------------------------------------------------
    if (action === 'delete' || req.method === 'DELETE') {
      const mediaId = (req.body?.mediaId as string) || (req.query?.mediaId as string) || (req.query?.id as string);

      if (!mediaId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter "mediaId"'
        });
      }

      const rows = await sql`
        SELECT id, blob_url, preview_url, url 
        FROM media_items 
        WHERE id = ${mediaId} 
        LIMIT 1;
      `;

      if (rows.length > 0) {
        const blobUrl = rows[0].blob_url || rows[0].preview_url || rows[0].url;
        if (blobUrl && blobUrl.includes('vercel-storage.com')) {
          try {
            await del(blobUrl, blobAuthOptions as DeleteCommandOptions);
            console.log(`Deleted Blob object: ${blobUrl}`);
          } catch (delErr: any) {
            console.warn(`Could not delete Blob object (ignoring): ${delErr.message}`);
          }
        }

        await sql`DELETE FROM media_items WHERE id = ${mediaId};`;
      }

      return res.status(200).json({
        success: true,
        mediaId
      });
    }

    // ----------------------------------------------------
    // PUT: Update item metadata
    // ----------------------------------------------------
    if (req.method === 'PUT') {
      const id = (req.query.id as string) || (req.body?.id as string) || (req.body?.mediaId as string);
      if (!id) {
        return res.status(400).json({ error: 'Missing media id' });
      }
      const updated = await updateMediaItemInDb(id, req.body || {});
      if (!updated) {
        return res.status(404).json({ error: 'Media item not found' });
      }
      return res.status(200).json(updated);
    }

    // ----------------------------------------------------
    // UPLOAD: Default POST behavior (or action === 'upload')
    // ----------------------------------------------------
    if (req.method === 'POST') {
      const { title, fileType, category, fileSize, courseIds, fileData, fileName } = req.body || {};

      if (!title || !fileData || !fileName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters (title, fileName, fileData)'
        });
      }

      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'mp4'];
      if (!allowed.includes(ext)) {
        return res.status(400).json({
          success: false,
          error: `Security Violation: File extension ".${ext}" is not permitted.`
        });
      }

      let buffer: Buffer;
      if (typeof fileData === 'string' && fileData.includes('base64,')) {
        buffer = Buffer.from(fileData.split('base64,')[1], 'base64');
      } else if (typeof fileData === 'string') {
        buffer = Buffer.from(fileData, 'base64');
      } else {
        buffer = Buffer.from(fileData);
      }

      const safeFileName = `materials/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const blobOptions: PutCommandOptions = {
        access: 'public',
        addRandomSuffix: false,
        ...blobAuthOptions
      };

      const blob = await put(safeFileName, buffer, blobOptions);

      const mediaId = `media-${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];
      const categoryName = category || 'Syllabus';
      const type = fileType || (ext === 'pdf' ? 'pdf' : ext === 'mp4' ? 'video' : 'image');
      const coursesArr = Array.isArray(courseIds) ? courseIds : ['ALL'];
      const formattedSize = fileSize || `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`;

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
        fileName: fileName || title,
        fileType: type,
        category: categoryName,
        fileSize: formattedSize,
        uploadDate: today,
        isFavorite: false,
        previewUrl: blob.url,
        blobUrl: blob.url,
        courseIds: coursesArr
      };

      return res.status(200).json({
        success: true,
        mediaItem: newItem
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[API /api/media] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error in media API'
    });
  }
}
