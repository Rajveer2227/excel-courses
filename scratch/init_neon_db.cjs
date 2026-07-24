const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing from .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function initDb() {
  console.log('Connecting to Neon PostgreSQL...');

  // Inspect existing columns
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'media_items';
  `;

  console.log('Existing columns in media_items:', cols);

  // Add missing columns if table already exists
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS file_type VARCHAR(50) DEFAULT 'pdf';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS course_ids TEXT[] DEFAULT '{}';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS file_size VARCHAR(50) DEFAULT '0 KB';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS upload_date VARCHAR(50) DEFAULT '';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS preview_url TEXT DEFAULT '';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS blob_url TEXT DEFAULT '';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS blob_pathname TEXT DEFAULT '';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) DEFAULT '';`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`;
  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`;

  console.log('✅ media_items table migration completed.');

  const countRes = await sql`SELECT COUNT(*) FROM media_items;`;
  console.log(`Total rows in media_items: ${countRes[0].count}`);
}

initDb().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
