import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = getDb();

    // Verify existing rows
    const countRes = await sql`SELECT COUNT(*) FROM media_items;`;
    const count = parseInt(countRes[0].count, 10);

    if (count > 0) {
      return res.status(200).json({
        success: true,
        message: `Database already seeded with ${count} media items.`,
        count
      });
    }

    // Seed default items
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
  } catch (err: any) {
    console.error('[API /api/media/seed] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to seed database'
    });
  }
}
