import { getSql, initializeSchema } from '../api/lib/db.js';

async function cleanupTestCampaigns() {
  await initializeSchema();
  const sql = getSql();

  console.log('=== CLEANING UP AUTOMATED TEST CAMPAIGNS FROM NEON POSTGRESQL ===\n');

  const result = await sql`
    UPDATE campaigns
    SET is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE (
      campaign_name LIKE 'Test Schedule%'
      OR campaign_name LIKE 'Auto Launch Test%'
      OR tags::text LIKE '%AutomatedTest%'
      OR tags::text LIKE '%AutoLaunchTest%'
    ) AND COALESCE(is_deleted, false) = false
    RETURNING id, campaign_name
  `;

  console.log(`✓ Soft-deleted ${result.length} test campaign(s):`);
  for (const row of result) {
    console.log(`   - [${row.id}] ${row.campaign_name}`);
  }

  console.log('\n✅ DATABASE CLEANUP COMPLETE!');
  process.exit(0);
}

cleanupTestCampaigns().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
