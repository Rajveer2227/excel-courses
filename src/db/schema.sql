-- ============================================================================
-- PRODUCTION NEON POSTGRESQL DATABASE SCHEMA
-- Target Subsystem: Swift Share & Bulk Mobile Dispatch
-- ============================================================================

-- 1. ENUMS FOR STATE MACHINE & MEDIA TYPES
CREATE TYPE campaign_status_enum AS ENUM (
    'DRAFT',
    'QUEUED',
    'PROCESSING',
    'PAUSED',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE recipient_status_enum AS ENUM (
    'QUEUED',
    'SENDING',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED',
    'RETRYING'
);

CREATE TYPE media_type_enum AS ENUM (
    'pdf',
    'image',
    'video'
);

-- 2. MEDIA ITEMS REPOSITORY TABLE
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

-- 3. WHATSAPP TEMPLATES TABLE (META COMPLIANT)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    category VARCHAR(50) NOT NULL DEFAULT 'MARKETING',
    header_type VARCHAR(20) DEFAULT 'NONE', -- NONE, TEXT, DOCUMENT, IMAGE, VIDEO
    body_text TEXT NOT NULL,
    variable_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'APPROVED', -- APPROVED, PENDING, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CAMPAIGNS TABLE
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

-- 5. CAMPAIGN RECIPIENTS & IDEMPOTENCY TABLE
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

-- 6. SHARE HISTORY LOGS TABLE
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

-- 7. RECENT CONTACTS TABLE
CREATE TABLE IF NOT EXISTS recent_contacts (
    phone VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255),
    last_course_title VARCHAR(255),
    last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. SECURITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    actor VARCHAR(100) DEFAULT 'system',
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES & CONSTRAINTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_recipients_phone ON campaign_recipients(phone_e164);
CREATE INDEX IF NOT EXISTS idx_recipients_idempotency ON campaign_recipients(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_share_logs_phone ON share_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
