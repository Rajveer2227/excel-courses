import { getSql, initializeSchema } from '../api/lib/db.js';

async function purgeE2ECampaigns() {
  await initializeSchema();
  const sql = getSql();

  console.log('=== PURGING REMAINING E2E TEST CAMPAIGNS ===\n');

  const result = await sql`
    UPDATE campaigns
    SET is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE (
      id LIKE 'e2e_%'
      OR campaign_name LIKE '%Full Stack Web Dev July 2026 Batch%'
      OR campaign_name LIKE '% Copy'
      OR campaign_name LIKE 'cmp-test%'
    ) AND COALESCE(is_deleted, false) = false
    RETURNING id, campaign_name
  `;

  console.log(`✓ Soft-deleted ${result.length} e2e test campaign(s):`);
  for (const row of result) {
    console.log(`   - [${row.id}] "${row.campaign_name}"`);
  }

  const remaining = await sql`
    SELECT id, campaign_name, status, created_at
    FROM campaigns
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY created_at DESC
  `;

  console.log(`\nRemaining Active Campaigns (${remaining.length}):`);
  for (const r of remaining) {
    console.log(`   - [${r.id}] "${r.campaign_name}" (${r.status})`);
  }

  process.exit(0);
}

purgeE2ECampaigns().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
