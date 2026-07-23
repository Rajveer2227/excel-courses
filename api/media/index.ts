import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getMediaItemsFromDb,
  addMediaItemToDb,
  updateMediaItemInDb,
  deleteMediaItemFromDb
} from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const items = await getMediaItemsFromDb();
        return res.status(200).json(items);
      }

      case 'POST': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        if (!body || !body.title || !body.fileType || !body.category) {
          return res.status(400).json({ error: 'Missing required media fields (title, fileType, category)' });
        }

        const newItem = await addMediaItemToDb({
          id: body.id,
          title: body.title,
          fileType: body.fileType,
          category: body.category,
          fileSize: body.fileSize || '1.0 MB',
          courseIds: body.courseIds || ['ALL'],
          isFavorite: body.isFavorite || false,
          previewUrl: body.previewUrl
        });

        return res.status(201).json(newItem);
      }

      case 'PUT': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const id = (req.query?.id as string) || body?.id;
        if (!id) {
          return res.status(400).json({ error: 'Missing media item id' });
        }

        const updated = await updateMediaItemInDb(id, body);
        if (!updated) {
          return res.status(404).json({ error: 'Media item not found' });
        }
        return res.status(200).json(updated);
      }

      case 'DELETE': {
        const id = (req.query?.id as string) || (typeof req.body === 'object' ? req.body?.id : undefined);
        if (!id) {
          return res.status(400).json({ error: 'Missing media item id' });
        }

        const success = await deleteMediaItemFromDb(id);
        if (!success) {
          return res.status(404).json({ error: 'Media item not found' });
        }
        return res.status(200).json({ success: true, id });
      }

      default:
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
