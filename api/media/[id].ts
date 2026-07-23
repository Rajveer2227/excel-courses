import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateMediaItemInDb, deleteMediaItemFromDb } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const mediaId = Array.isArray(id) ? id[0] : id;

  if (!mediaId) {
    return res.status(400).json({ error: 'Missing media id' });
  }

  try {
    switch (req.method) {
      case 'PUT': {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const updated = await updateMediaItemInDb(mediaId, body);
        if (!updated) {
          return res.status(404).json({ error: 'Media item not found' });
        }
        return res.status(200).json(updated);
      }

      case 'DELETE': {
        const success = await deleteMediaItemFromDb(mediaId);
        if (!success) {
          return res.status(404).json({ error: 'Media item not found' });
        }
        return res.status(200).json({ success: true, id: mediaId });
      }

      default:
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
