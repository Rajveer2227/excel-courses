import { getSql, initializeSchema, getCampaignsFromDb, getCampaignStatsFromDb } from '../api/lib/db.js';

async function diagnoseDashboard() {
  await initializeSchema();
  const sql = getSql();

  console.log('=== CAMPAIGN DASHBOARD DIAGNOSTIC ===\n');

  // 1. Raw count in DB
  const rawAll = await sql`SELECT id, campaign_name, status, is_deleted, is_archived, created_at FROM campaigns ORDER BY created_at DESC`;
  console.log(`Total rows in campaigns table (including deleted): ${rawAll.length}`);
  for (const r of rawAll) {
    console.log(`  [${r.id}] "${r.campaign_name}" status=${r.status} deleted=${r.is_deleted} archived=${r.is_archived} created=${r.created_at}`);
  }

  console.log('\n--- Active (not deleted) campaigns ---');
  const active = await sql`SELECT id, campaign_name, status, is_deleted, is_archived FROM campaigns WHERE COALESCE(is_deleted, false) = false`;
  console.log(`Count: ${active.length}`);
  for (const r of active) {
    console.log(`  [${r.id}] "${r.campaign_name}" status=${r.status}`);
  }

  console.log('\n--- getCampaignsFromDb() result ---');
  try {
    const result = await getCampaignsFromDb({});
    console.log(`getCampaignsFromDb returned: ${result.campaigns.length} campaigns, total=${result.total}`);
    for (const c of result.campaigns) {
      console.log(`  [${c.id}] "${c.campaignName}" status=${c.status}`);
    }
  } catch (e) {
    console.error('getCampaignsFromDb threw:', e);
  }

  console.log('\n--- getCampaignStatsFromDb() result ---');
  try {
    const stats = await getCampaignStatsFromDb();
    console.log('Stats:', JSON.stringify(stats, null, 2));
  } catch (e) {
    console.error('getCampaignStatsFromDb threw:', e);
  }

  process.exit(0);
}

diagnoseDashboard().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
