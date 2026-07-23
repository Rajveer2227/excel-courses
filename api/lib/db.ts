import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { initialMediaItems, type MediaItem } from '../../src/data/shareData.js';

// Ensure .env.local and .env environment variables are loaded in local serverless environments
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * Production Neon PostgreSQL Reusable Client & Utility Layer
 * Strictly reads DATABASE_URL from server environment variables only.
 */

export function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }
  return neon(connectionString);
}

/**
 * Execute healthcheck query against Neon PostgreSQL instance
 */
export async function checkDatabaseHealth(): Promise<{ success: boolean; timestamp?: string; error?: string }> {
  try {
    const sql = getSql();
    const result = await sql`SELECT NOW() as current_time`;
    const timestamp = result[0]?.current_time ? String(result[0].current_time) : new Date().toISOString();
    return {
      success: true,
      timestamp
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown database connection error';
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Initialize database tables if they do not exist
 */
export async function initializeSchema(): Promise<{ success: boolean; message: string }> {
  try {
    const sql = getSql();

    // 1. Create Enums if not exists
    await sql`
      DO $$ BEGIN
        CREATE TYPE campaign_status_enum AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE recipient_status_enum AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RETRYING');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // 2. Create Media Items Table
    await sql`
      CREATE TABLE IF NOT EXISTS media_items (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL DEFAULT '',
        file_type VARCHAR(50) NOT NULL,
        file_size VARCHAR(50) NOT NULL,
        file_size_bytes BIGINT NOT NULL DEFAULT 0,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        url TEXT NOT NULL DEFAULT '',
        blob_path TEXT,
        course_ids TEXT[] DEFAULT '{}',
        is_favorite BOOLEAN DEFAULT FALSE,
        mime_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
        checksum VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Create WhatsApp Templates Table
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        language VARCHAR(10) NOT NULL DEFAULT 'en',
        category VARCHAR(50) NOT NULL DEFAULT 'MARKETING',
        header_type VARCHAR(20) DEFAULT 'NONE',
        body_text TEXT NOT NULL,
        variable_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'APPROVED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Create Campaigns Table
    await sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        status campaign_status_enum NOT NULL DEFAULT 'DRAFT',
        total_recipients INT NOT NULL DEFAULT 0,
        delivered_count INT NOT NULL DEFAULT 0,
        failed_count INT NOT NULL DEFAULT 0,
        delay_seconds INT NOT NULL DEFAULT 1,
        csv_file_name VARCHAR(255),
        material_ids TEXT[] DEFAULT '{}',
        material_titles TEXT[] DEFAULT '{}',
        template_id VARCHAR(100) REFERENCES whatsapp_templates(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // 5. Create Campaign Recipients Table
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id VARCHAR(100) PRIMARY KEY,
        campaign_id VARCHAR(100) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        phone_e164 VARCHAR(20) NOT NULL,
        recipient_name VARCHAR(255),
        status recipient_status_enum NOT NULL DEFAULT 'QUEUED',
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        whatsapp_message_id VARCHAR(255),
        error_details TEXT,
        retry_count INT DEFAULT 0,
        dispatched_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. Create Share Logs Table
    await sql`
      CREATE TABLE IF NOT EXISTS share_logs (
        id VARCHAR(100) PRIMARY KEY,
        recipient_phone VARCHAR(20) NOT NULL,
        recipient_name VARCHAR(255),
        course_id VARCHAR(100),
        course_title VARCHAR(255),
        materials TEXT[] DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'Delivered',
        channel VARCHAR(50) NOT NULL DEFAULT 'WhatsApp',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 7. Create Recent Contacts Table
    await sql`
      CREATE TABLE IF NOT EXISTS recent_contacts (
        phone VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255),
        last_course_title VARCHAR(255),
        last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 8. Create Audit Logs Table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        actor VARCHAR(100) DEFAULT 'system',
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return {
      success: true,
      message: 'Schema successfully initialized or verified.'
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown schema initialization error';
    return {
      success: false,
      message: errorMsg
    };
  }
}

export function deriveMimeType(fileType?: string, fileNameOrTitle?: string): string {
  const ext = (fileNameOrTitle || '').split('.').pop()?.toLowerCase() || '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'doc' || ext === 'docx') return 'application/msword';

  if (fileType === 'pdf') return 'application/pdf';
  if (fileType === 'image') return 'image/png';
  if (fileType === 'video') return 'video/mp4';
  if (fileType === 'doc') return 'application/msword';

  return 'application/octet-stream';
}

/**
 * Get all media items from Neon PostgreSQL DB (Seeds initial items if table is empty)
 */
export async function getMediaItemsFromDb(): Promise<MediaItem[]> {
  await initializeSchema();
  const sql = getSql();

  const rows = await sql`
    SELECT id, title, file_type, category, file_size, is_favorite, course_ids, url,
           to_char(created_at, 'YYYY-MM-DD') as upload_date
    FROM media_items
    ORDER BY created_at DESC
  `;

  if (rows.length === 0) {
    // Seed initial media items
    for (const item of initialMediaItems) {
      const mimeType = deriveMimeType(item.fileType, item.title);
      await sql`
        INSERT INTO media_items (id, title, file_name, file_type, category, file_size, is_favorite, course_ids, url, mime_type)
        VALUES (${item.id}, ${item.title}, ${item.title}, ${item.fileType}, ${item.category}, ${item.fileSize}, ${item.isFavorite}, ${item.courseIds}, ${item.previewUrl || ''}, ${mimeType})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    const seededRows = await sql`
      SELECT id, title, file_type, category, file_size, is_favorite, course_ids, url,
             to_char(created_at, 'YYYY-MM-DD') as upload_date
      FROM media_items
      ORDER BY created_at DESC
    `;
    return mapRowsToMediaItems(seededRows);
  }

  return mapRowsToMediaItems(rows);
}

/**
 * Add a new media item to Neon PostgreSQL
 */
export async function addMediaItemToDb(item: Omit<MediaItem, 'uploadDate'> & { id?: string }): Promise<MediaItem> {
  await initializeSchema();
  const sql = getSql();

  const id = item.id || `media-${Date.now()}`;
  const uploadDate = new Date().toISOString().split('T')[0];
  const mimeType = deriveMimeType(item.fileType, item.title);

  await sql`
    INSERT INTO media_items (id, title, file_name, file_type, category, file_size, is_favorite, course_ids, url, mime_type)
    VALUES (
      ${id},
      ${item.title},
      ${item.title},
      ${item.fileType},
      ${item.category},
      ${item.fileSize},
      ${item.isFavorite || false},
      ${item.courseIds || []},
      ${item.previewUrl || ''},
      ${mimeType}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      file_type = EXCLUDED.file_type,
      category = EXCLUDED.category,
      file_size = EXCLUDED.file_size,
      is_favorite = EXCLUDED.is_favorite,
      course_ids = EXCLUDED.course_ids,
      url = EXCLUDED.url,
      mime_type = EXCLUDED.mime_type
  `;

  return {
    ...item,
    id,
    uploadDate,
    isFavorite: item.isFavorite || false
  };
}

/**
 * Toggle favorite or update a media item in Neon PostgreSQL
 */
export async function updateMediaItemInDb(id: string, updates: Partial<MediaItem>): Promise<MediaItem | null> {
  await initializeSchema();
  const sql = getSql();

  if (updates.isFavorite !== undefined) {
    await sql`
      UPDATE media_items
      SET is_favorite = ${updates.isFavorite}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
  }

  const rows = await sql`
    SELECT id, title, file_type, category, file_size, is_favorite, course_ids, url,
           to_char(created_at, 'YYYY-MM-DD') as upload_date
    FROM media_items
    WHERE id = ${id}
  `;

  if (rows.length === 0) return null;
  return mapRowsToMediaItems(rows)[0];
}

/**
 * Delete a media item from Neon PostgreSQL
 */
export async function deleteMediaItemFromDb(id: string): Promise<boolean> {
  await initializeSchema();
  const sql = getSql();
  const res = await sql`DELETE FROM media_items WHERE id = ${id} RETURNING id`;
  return res.length > 0;
}

function mapRowsToMediaItems(rows: Record<string, unknown>[]): MediaItem[] {
  return rows.map(r => ({
    id: String(r.id),
    title: String(r.title),
    fileType: r.file_type as MediaItem['fileType'],
    category: r.category as MediaItem['category'],
    fileSize: String(r.file_size),
    uploadDate: String(r.upload_date || new Date().toISOString().split('T')[0]),
    isFavorite: Boolean(r.is_favorite),
    courseIds: Array.isArray(r.course_ids) ? r.course_ids.map(String) : [],
    previewUrl: r.url ? String(r.url) : undefined
  }));
}
