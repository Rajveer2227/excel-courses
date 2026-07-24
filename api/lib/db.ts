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

export function getDb() {
  return getSql();
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

let isSchemaInitialized = false;

/**
 * Initialize database tables if they do not exist
 */
export async function initializeSchema(): Promise<{ success: boolean; message: string }> {
  if (isSchemaInitialized) return { success: true, message: 'Schema already initialized in memory.' };
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

    // Migration safety for media_items columns
    await sql`ALTER TABLE media_items ALTER COLUMN url DROP NOT NULL;`;
    await sql`ALTER TABLE media_items ALTER COLUMN url SET DEFAULT '';`;
    await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS blob_url TEXT;`;
    await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS blob_pathname TEXT;`;
    await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS preview_url TEXT;`;

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
        campaign_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        notes TEXT DEFAULT '',
        tags TEXT[] DEFAULT '{}',
        is_archived BOOLEAN DEFAULT FALSE,
        archived_at TIMESTAMP WITH TIME ZONE,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP WITH TIME ZONE,
        raw_contacts_text TEXT DEFAULT '',
        csv_file_name VARCHAR(255),
        material_ids TEXT[] DEFAULT '{}',
        material_titles TEXT[] DEFAULT '{}',
        created_by VARCHAR(100) DEFAULT 'System Admin',
        delivery_settings JSONB DEFAULT '{"delayMode":"1","delaySeconds":1,"randomDelayMin":1,"randomDelayMax":5,"batchSize":50,"batchPauseSeconds":300,"retryFailed":true,"maxRetries":3,"stopAfterErrors":5,"businessHoursOnly":false,"businessStart":"09:00","businessEnd":"18:00","skipWeekends":false,"skipPublicHolidays":false,"timezone":"Asia/Kolkata (IST)"}'::jsonb,
        schedule_settings JSONB DEFAULT '{"type":"one_time","recurringPattern":"none","scheduledDate":"","scheduledTime":"","timezone":"Asia/Kolkata (IST)"}'::jsonb,
        recipient_stats JSONB DEFAULT '{"totalCount":0,"validCount":0,"invalidCount":0,"duplicateCount":0,"skippedCount":0,"deliveredCount":0,"failedCount":0}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        scheduled_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // Alter table migrations if columns exist from older versions
    await sql`ALTER TABLE campaigns ALTER COLUMN title DROP NOT NULL;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255);`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS raw_contacts_text TEXT DEFAULT '';`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'System Admin';`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS delivery_settings JSONB DEFAULT '{"delayMode":"1","delaySeconds":1,"randomDelayMin":1,"randomDelayMax":5,"batchSize":50,"batchPauseSeconds":300,"retryFailed":true,"maxRetries":3,"stopAfterErrors":5,"businessHoursOnly":false,"businessStart":"09:00","businessEnd":"18:00","skipWeekends":false,"skipPublicHolidays":false,"timezone":"Asia/Kolkata (IST)"}'::jsonb;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS schedule_settings JSONB DEFAULT '{"type":"one_time","recurringPattern":"none","scheduledDate":"","scheduledTime":"","timezone":"Asia/Kolkata (IST)"}'::jsonb;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS csv_file_name VARCHAR(255);`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS material_ids TEXT[] DEFAULT '{}';`;
    await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS material_titles TEXT[] DEFAULT '{}';`;

    // 5. Create Campaign Recipients Table (Production Ready)
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id VARCHAR(100) PRIMARY KEY,
        campaign_id VARCHAR(100) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        phone_number VARCHAR(30) NOT NULL,
        contact_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        failure_reason TEXT,
        attempt_count INT DEFAULT 0,
        scheduled_at TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      DO $$ BEGIN
        ALTER TABLE campaign_recipients ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
        ALTER TABLE campaign_recipients ALTER COLUMN status SET DEFAULT 'Pending';
        ALTER TABLE campaign_recipients ALTER COLUMN phone_e164 DROP NOT NULL;
        ALTER TABLE campaign_recipients ALTER COLUMN idempotency_key DROP NOT NULL;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `;
    await sql`ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);`;
    await sql`ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);`;
    await sql`ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS failure_reason TEXT;`;
    await sql`ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 0;`;

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

    isSchemaInitialized = true;
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
    fileSize: String(r.file_size || '1.0 MB'),
    isFavorite: Boolean(r.is_favorite),
    courseIds: Array.isArray(r.course_ids) ? r.course_ids as string[] : ['ALL'],
    uploadDate: String(r.upload_date || ''),
    previewUrl: r.url ? String(r.url) : undefined
  }));
}

// ==========================================
// CAMPAIGN MANAGEMENT SYSTEM DATABASE HELPERS
// ==========================================

export async function logAuditInDb(eventType: string, details: Record<string, any>, actor = 'system') {
  try {
    const sql = getSql();
    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await sql`
      INSERT INTO audit_logs (id, event_type, actor, details)
      VALUES (${id}, ${eventType}, ${actor}, ${JSON.stringify(details)})
    `;
  } catch (e) {
    console.warn('Failed to record audit log:', e);
  }
}

export function mapRowToCampaign(row: any) {
  return {
    id: String(row.id),
    campaignName: String(row.campaign_name || row.title || 'Untitled Campaign'),
    status: String(row.status || 'Draft'),
    notes: String(row.notes || ''),
    tags: Array.isArray(row.tags) ? row.tags : [],
    isArchived: Boolean(row.is_archived),
    isDeleted: Boolean(row.is_deleted),
    rawContactsText: String(row.raw_contacts_text || ''),
    csvFileName: row.csv_file_name || undefined,
    materialIds: Array.isArray(row.material_ids) ? row.material_ids : [],
    materialTitles: Array.isArray(row.material_titles) ? row.material_titles : [],
    createdBy: String(row.created_by || 'System Admin'),
    deliverySettings: typeof row.delivery_settings === 'string' ? JSON.parse(row.delivery_settings) : (row.delivery_settings || {}),
    scheduleSettings: typeof row.schedule_settings === 'string' ? JSON.parse(row.schedule_settings) : (row.schedule_settings || {}),
    recipientStats: typeof row.recipient_stats === 'string' ? JSON.parse(row.recipient_stats) : (row.recipient_stats || {}),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined
  };
}

export async function getCampaignsFromDb(options?: {
  search?: string;
  status?: string;
  tag?: string;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}) {
  await initializeSchema();
  await checkDueScheduledCampaignsInDb();
  const sql = getSql();

  const search = (options?.search || '').trim().toLowerCase();
  const statusFilter = (options?.status || '').trim();
  const tagFilter = (options?.tag || '').trim();
  const isArchived = options?.isArchived === true;
  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options?.limit) || 10));
  const offset = (page - 1) * limit;
  const sort = options?.sort || 'newest';

  const rows = await sql`
    SELECT id, campaign_name, status, notes, tags, is_archived, is_deleted,
           raw_contacts_text, csv_file_name, material_ids, material_titles,
           created_by, delivery_settings, schedule_settings, recipient_stats,
           created_at, updated_at, scheduled_at, completed_at
    FROM campaigns
    WHERE COALESCE(is_deleted, false) = false
      AND COALESCE(is_archived, false) = ${isArchived}
    ORDER BY created_at DESC
  `;

  let filtered = rows;

  if (statusFilter && statusFilter.toLowerCase() !== 'all') {
    filtered = filtered.filter(row => String(row.status || '').toLowerCase() === statusFilter.toLowerCase());
  }

  if (tagFilter && tagFilter.toLowerCase() !== 'all') {
    filtered = filtered.filter(row => Array.isArray(row.tags) && row.tags.some((t: string) => t.toLowerCase() === tagFilter.toLowerCase()));
  }

  if (search) {
    filtered = filtered.filter(row => {
      const nameMatch = String(row.campaign_name || '').toLowerCase().includes(search);
      const notesMatch = String(row.notes || '').toLowerCase().includes(search);
      const tagsMatch = Array.isArray(row.tags) && row.tags.some((t: string) => t.toLowerCase().includes(search));
      const statusMatch = String(row.status || '').toLowerCase().includes(search);
      const courseMatch = Array.isArray(row.material_titles) && row.material_titles.some((t: string) => t.toLowerCase().includes(search));
      return nameMatch || notesMatch || tagsMatch || statusMatch || courseMatch;
    });
  }

  if (sort === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sort === 'name') {
    filtered.sort((a, b) => String(a.campaign_name).localeCompare(String(b.campaign_name)));
  } else if (sort === 'recipients') {
    filtered.sort((a, b) => {
      const statsA = typeof a.recipient_stats === 'string' ? JSON.parse(a.recipient_stats) : (a.recipient_stats || {});
      const statsB = typeof b.recipient_stats === 'string' ? JSON.parse(b.recipient_stats) : (b.recipient_stats || {});
      return ((statsB.totalCount || 0) - (statsA.totalCount || 0));
    });
  } else if (sort === 'status') {
    filtered.sort((a, b) => String(a.status).localeCompare(String(b.status)));
  } else {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedRows = filtered.slice(offset, offset + limit);

  return {
    success: true,
    message: 'Campaigns retrieved successfully',
    data: paginatedRows.map(mapRowToCampaign),
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    timestamp: new Date().toISOString()
  };
}

export async function getCampaignByIdFromDb(id: string) {
  await initializeSchema();
  const sql = getSql();

  const rows = await sql`
    SELECT id, campaign_name, status, notes, tags, is_archived, is_deleted,
           raw_contacts_text, csv_file_name, material_ids, material_titles,
           created_by, delivery_settings, schedule_settings, recipient_stats,
           created_at, updated_at, scheduled_at, completed_at
    FROM campaigns
    WHERE id = ${id} AND COALESCE(is_deleted, false) = false
  `;

  if (rows.length === 0) return null;
  const campaign = mapRowToCampaign(rows[0]);

  const recRows = await sql`
    SELECT id, COALESCE(phone_number, phone_e164) as phone_number, COALESCE(contact_name, recipient_name) as contact_name, status, failure_reason, attempt_count
    FROM campaign_recipients
    WHERE campaign_id = ${id}
    ORDER BY created_at ASC
  `;

  const parsedContacts = recRows.map(r => ({
    id: String(r.id),
    phone: String(r.phone_number),
    name: String(r.contact_name || ''),
    status: String(r.status || 'Pending'),
    failureReason: r.failure_reason ? String(r.failure_reason) : undefined,
    attemptCount: Number(r.attempt_count || 0)
  }));

  return {
    ...campaign,
    parsedContacts
  };
}

export async function createCampaignInDb(data: any) {
  await initializeSchema();
  const sql = getSql();

  const id = data.id || `cmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const campaignName = (data.campaignName || 'New Campaign').trim();
  const status = data.status || 'Draft';
  const notes = data.notes || '';
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const rawContactsText = data.rawContactsText || '';
  const csvFileName = data.csvFileName || null;
  const materialIds = Array.isArray(data.materialIds) ? data.materialIds : [];
  const materialTitles = Array.isArray(data.materialTitles) ? data.materialTitles : [];
  const createdBy = data.createdBy || 'System Admin';

  const deliverySettings = JSON.stringify(data.deliverySettings || {
    delayMode: '1',
    delaySeconds: 1,
    randomDelayMin: 1,
    randomDelayMax: 5,
    batchSize: 50,
    batchPauseSeconds: 300,
    retryFailed: true,
    maxRetries: 3,
    stopAfterErrors: 5,
    businessHoursOnly: false,
    businessStart: '09:00',
    businessEnd: '18:00',
    skipWeekends: false,
    skipPublicHolidays: false,
    timezone: 'Asia/Kolkata (IST)'
  });

  const scheduleSettings = JSON.stringify(data.scheduleSettings || {
    type: 'one_time',
    recurringPattern: 'none',
    scheduledDate: '',
    scheduledTime: '',
    timezone: 'Asia/Kolkata (IST)'
  });

  const recipientStats = JSON.stringify(data.recipientStats || {
    totalCount: 0,
    validCount: 0,
    invalidCount: 0,
    duplicateCount: 0,
    skippedCount: 0,
    deliveredCount: 0,
    failedCount: 0
  });

  await sql`
    INSERT INTO campaigns (
      id, campaign_name, title, status, notes, tags, raw_contacts_text, csv_file_name,
      material_ids, material_titles, created_by, delivery_settings, schedule_settings, recipient_stats
    ) VALUES (
      ${id}, ${campaignName}, ${campaignName}, ${status}, ${notes}, ${tags}, ${rawContactsText}, ${csvFileName},
      ${materialIds}, ${materialTitles}, ${createdBy}, ${deliverySettings}::jsonb, ${scheduleSettings}::jsonb, ${recipientStats}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      campaign_name = EXCLUDED.campaign_name,
      title = EXCLUDED.campaign_name,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      tags = EXCLUDED.tags,
      raw_contacts_text = EXCLUDED.raw_contacts_text,
      csv_file_name = EXCLUDED.csv_file_name,
      material_ids = EXCLUDED.material_ids,
      material_titles = EXCLUDED.material_titles,
      delivery_settings = EXCLUDED.delivery_settings,
      schedule_settings = EXCLUDED.schedule_settings,
      recipient_stats = EXCLUDED.recipient_stats,
      updated_at = CURRENT_TIMESTAMP
  `;

  if (Array.isArray(data.parsedContacts) && data.parsedContacts.length > 0) {
    await sql`DELETE FROM campaign_recipients WHERE campaign_id = ${id}`;
    for (const rec of data.parsedContacts) {
      const recId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const phone = rec.phone || rec.phone_number;
      if (phone) {
        await sql`
          INSERT INTO campaign_recipients (
            id, campaign_id, phone_number, phone_e164, contact_name, recipient_name, status, idempotency_key
          ) VALUES (
            ${recId}, ${id}, ${phone}, ${phone}, ${rec.name || rec.contact_name || ''}, ${rec.name || rec.contact_name || ''}, ${rec.status || 'Pending'}, ${recId}
          )
        `;
      }
    }
  }

  await logAuditInDb('CAMPAIGN_CREATED', { campaignId: id, campaignName }, createdBy);
  return getCampaignByIdFromDb(id);
}

export async function updateCampaignInDb(id: string, data: any) {
  await initializeSchema();
  const sql = getSql();

  const existing = await getCampaignByIdFromDb(id);
  if (!existing) return null;

  const campaignName = data.campaignName !== undefined ? data.campaignName : existing.campaignName;
  const status = data.status !== undefined ? data.status : existing.status;
  const notes = data.notes !== undefined ? data.notes : existing.notes;
  const tags = data.tags !== undefined ? data.tags : existing.tags;
  const rawContactsText = data.rawContactsText !== undefined ? data.rawContactsText : existing.rawContactsText;
  const csvFileName = data.csvFileName !== undefined ? data.csvFileName : existing.csvFileName;
  const materialIds = data.materialIds !== undefined ? data.materialIds : existing.materialIds;
  const materialTitles = data.materialTitles !== undefined ? data.materialTitles : existing.materialTitles;

  const deliverySettings = JSON.stringify(data.deliverySettings !== undefined ? data.deliverySettings : existing.deliverySettings);
  const scheduleSettings = JSON.stringify(data.scheduleSettings !== undefined ? data.scheduleSettings : existing.scheduleSettings);
  const recipientStats = JSON.stringify(data.recipientStats !== undefined ? data.recipientStats : existing.recipientStats);

  await sql`
    UPDATE campaigns
    SET campaign_name = ${campaignName},
        title = ${campaignName},
        status = ${status},
        notes = ${notes},
        tags = ${tags},
        raw_contacts_text = ${rawContactsText},
        csv_file_name = ${csvFileName},
        material_ids = ${materialIds},
        material_titles = ${materialTitles},
        delivery_settings = ${deliverySettings}::jsonb,
        schedule_settings = ${scheduleSettings}::jsonb,
        recipient_stats = ${recipientStats}::jsonb,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;

  if (Array.isArray(data.parsedContacts)) {
    await sql`DELETE FROM campaign_recipients WHERE campaign_id = ${id}`;
    for (const rec of data.parsedContacts) {
      const recId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const phone = rec.phone || rec.phone_number;
      if (phone) {
        await sql`
          INSERT INTO campaign_recipients (
            id, campaign_id, phone_number, contact_name, status
          ) VALUES (
            ${recId}, ${id}, ${phone}, ${rec.name || rec.contact_name || ''}, ${rec.status || 'Pending'}
          )
        `;
      }
    }
  }

  await logAuditInDb('CAMPAIGN_UPDATED', { campaignId: id, campaignName }, 'System Admin');
  return getCampaignByIdFromDb(id);
}

export async function deleteCampaignInDb(id: string) {
  await initializeSchema();
  const sql = getSql();

  const existing = await getCampaignByIdFromDb(id);
  if (!existing) return false;

  await sql`
    UPDATE campaigns
    SET is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;

  await logAuditInDb('CAMPAIGN_DELETED', { campaignId: id, campaignName: existing.campaignName }, 'System Admin');
  return true;
}

export async function archiveCampaignInDb(id: string, isArchived?: boolean) {
  await initializeSchema();
  const sql = getSql();

  const existing = await getCampaignByIdFromDb(id);
  if (!existing) return null;

  const targetArchived = isArchived !== undefined ? isArchived : !existing.isArchived;
  const newStatus = targetArchived ? 'Archived' : (existing.status === 'Archived' ? 'Draft' : existing.status);

  await sql`
    UPDATE campaigns
    SET is_archived = ${targetArchived},
        archived_at = ${targetArchived ? new Date().toISOString() : null},
        status = ${newStatus},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;

  await logAuditInDb(targetArchived ? 'CAMPAIGN_ARCHIVED' : 'CAMPAIGN_RESTORED', { campaignId: id, campaignName: existing.campaignName }, 'System Admin');
  return getCampaignByIdFromDb(id);
}

export async function duplicateCampaignInDb(id: string) {
  await initializeSchema();
  const existing = await getCampaignByIdFromDb(id);
  if (!existing) return null;

  const newId = `cmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newName = `${existing.campaignName} Copy`;

  const duplicated = await createCampaignInDb({
    id: newId,
    campaignName: newName,
    status: 'Draft',
    notes: existing.notes,
    tags: existing.tags,
    rawContactsText: existing.rawContactsText,
    csvFileName: existing.csvFileName,
    materialIds: existing.materialIds,
    materialTitles: existing.materialTitles,
    createdBy: existing.createdBy,
    deliverySettings: existing.deliverySettings,
    scheduleSettings: existing.scheduleSettings,
    recipientStats: existing.recipientStats,
    parsedContacts: existing.parsedContacts
  });

  await logAuditInDb('CAMPAIGN_DUPLICATED', { originalId: id, newId, newName }, 'System Admin');
  return duplicated;
}

export async function scheduleCampaignInDb(id: string, scheduleSettings: any) {
  await initializeSchema();
  const sql = getSql();

  const existing = await getCampaignByIdFromDb(id);
  if (!existing) return null;

  const scheduledAt = scheduleSettings?.scheduledDate && scheduleSettings?.scheduledTime
    ? new Date(`${scheduleSettings.scheduledDate}T${scheduleSettings.scheduledTime}`).toISOString()
    : new Date().toISOString();

  await sql`
    UPDATE campaigns
    SET status = 'Scheduled',
        schedule_settings = ${JSON.stringify(scheduleSettings)}::jsonb,
        scheduled_at = ${scheduledAt},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;

  await logAuditInDb('CAMPAIGN_SCHEDULED', { campaignId: id, scheduledAt, scheduleSettings }, 'System Admin');
  return getCampaignByIdFromDb(id);
}

export async function unscheduleCampaignInDb(id: string) {
  await initializeSchema();
  const sql = getSql();
  const existing = await getCampaignByIdFromDb(id);
  if (!existing) return null;

  await sql`
    UPDATE campaigns
    SET status = 'Draft',
        scheduled_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;

  await logAuditInDb('CAMPAIGN_UNSCHEDULED', { campaignId: id }, 'System Admin');
  return getCampaignByIdFromDb(id);
}

export async function checkDueScheduledCampaignsInDb() {
  await initializeSchema();
  const sql = getSql();
  const nowIso = new Date().toISOString();

  const dueRows = await sql`
    SELECT id, campaign_name, status, schedule_settings, scheduled_at
    FROM campaigns
    WHERE status = 'Scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= ${nowIso}
      AND COALESCE(is_deleted, false) = false
  `;

  for (const row of dueRows) {
    await sql`
      UPDATE campaigns
      SET status = 'Running',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${row.id}
    `;
    await logAuditInDb('CAMPAIGN_AUTO_STARTED', { campaignId: row.id, scheduledAt: row.scheduled_at }, 'System Scheduler');
  }

  return dueRows;
}

export async function getCampaignStatsFromDb() {
  await initializeSchema();
  const sql = getSql();

  const rows = await sql`
    SELECT id, status, is_archived, recipient_stats
    FROM campaigns
    WHERE COALESCE(is_deleted, false) = false
  `;

  let totalCampaigns = 0;
  let draft = 0;
  let scheduled = 0;
  let completed = 0;
  let archived = 0;
  let totalRecipients = 0;

  rows.forEach(r => {
    totalCampaigns++;
    const st = String(r.status || '').toLowerCase();
    if (r.is_archived) archived++;
    else if (st === 'draft') draft++;
    else if (st === 'scheduled') scheduled++;
    else if (st === 'completed') completed++;

    const stats = typeof r.recipient_stats === 'string' ? JSON.parse(r.recipient_stats) : (r.recipient_stats || {});
    totalRecipients += (stats.totalCount || stats.validCount || 0);
  });

  return {
    totalCampaigns,
    draft,
    scheduled,
    completed,
    archived,
    totalRecipients
  };
}
