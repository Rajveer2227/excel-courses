import { getSql, initializeSchema } from '../api/lib/db.js';

async function purgeAllTestAndSeedCampaigns() {
  await initializeSchema();
  const sql = getSql();

  console.log('=== PURGING ALL SEED AND TEST CAMPAIGNS FROM NEON POSTGRESQL ===\n');

  // Soft delete all paginated/test campaigns
  const result = await sql`
    UPDATE campaigns
    SET is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE (
      campaign_name LIKE 'Paginated Campaign%'
      OR campaign_name LIKE 'Test%'
      OR campaign_name LIKE 'Auto Launch%'
      OR tags::text LIKE '%StressTest%'
      OR tags::text LIKE '%AutomatedTest%'
      OR tags::text LIKE '%AutoLaunchTest%'
    ) AND COALESCE(is_deleted, false) = false
    RETURNING id, campaign_name
  `;

  console.log(`✓ Soft-deleted ${result.length} test/seed campaign(s)`);

  // Count remaining active campaigns in DB
  const remaining = await sql`
    SELECT id, campaign_name, status, created_at
    FROM campaigns
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY created_at DESC
  `;

  console.log(`\nRemaining Active Campaigns in Database (${remaining.length}):`);
  for (const r of remaining) {
    console.log(`   - [${r.id}] "${r.campaign_name}" (Status: ${r.status})`);
  }

  console.log('\n✅ ALL SEED & TEST CAMPAIGNS PURGED SUCCESSFULLY!');
  process.exit(0);
}

purgeAllTestAndSeedCampaigns().catch(err => {
  console.error('❌ Purge failed:', err);
  process.exit(1);
});
