import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

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

    await sql`
      DO $$ BEGIN
        CREATE TYPE media_type_enum AS ENUM ('pdf', 'image', 'video');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // 2. Create Media Items Table
    await sql`
      CREATE TABLE IF NOT EXISTS media_items (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type media_type_enum NOT NULL,
        file_size VARCHAR(50) NOT NULL,
        file_size_bytes BIGINT NOT NULL DEFAULT 0,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        url TEXT NOT NULL,
        blob_path TEXT,
        course_ids TEXT[] DEFAULT '{}',
        is_favorite BOOLEAN DEFAULT FALSE,
        mime_type VARCHAR(100) NOT NULL,
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
