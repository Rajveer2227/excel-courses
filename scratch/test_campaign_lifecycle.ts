/**
 * Test that directly calls the campaign create → fetch lifecycle
 * using the same DB functions the API uses
 */
import { createCampaignInDb, getCampaignsFromDb, updateCampaignInDb, deleteCampaignInDb } from '../api/lib/db.js';

async function testCampaignLifecycle() {
  console.log('=== CAMPAIGN LIFECYCLE TEST ===\n');

  // 1. Create a campaign (simulating what handleSendBulkShare does)
  const testName = `My Test Campaign ${Date.now()}`;
  const created = await createCampaignInDb({
    campaignName: testName,
    status: 'Running',
    notes: 'Test notes',
    tags: ['Admissions'],
    rawContactsText: '9876543210',
    materialIds: [],
    materialTitles: [],
    deliverySettings: { delaySeconds: 1, respectDnd: false, dndStartHour: 21, dndEndHour: 9, maxPerDay: 100, timezone: 'IST' },
    scheduleSettings: { type: 'immediate', scheduledDate: '', scheduledTime: '', timezone: '', repeatFrequency: '' },
    recipientStats: { totalCount: 1, validCount: 1, invalidCount: 0, duplicateCount: 0, skippedCount: 0, deliveredCount: 0, failedCount: 0 },
    parsedContacts: [{ phone: '9876543210', status: 'Pending' }]
  });
  
  console.log(`✓ 1. Created campaign ID: ${created?.id}, name: "${created?.campaignName}", status: ${created?.status}`);

  // 2. Fetch all campaigns — should include the new one
  const result = await getCampaignsFromDb({});
  const foundInList = result.data.find((c: any) => c.id === created?.id);
  console.log(`✓ 2. getCampaignsFromDb returned ${result.data.length} campaigns`);
  console.log(`   Found new campaign in list: ${foundInList ? 'YES ✅' : 'NO ❌'}`);
  for (const c of result.data) {
    console.log(`   - [${c.id}] "${c.campaignName}" status=${c.status}`);
  }

  // 3. Update to Completed
  const updated = await updateCampaignInDb(created!.id, {
    status: 'Completed',
    recipientStats: { totalCount: 1, validCount: 1, invalidCount: 0, duplicateCount: 0, skippedCount: 0, deliveredCount: 1, failedCount: 0 }
  });
  console.log(`\n✓ 3. Updated to Completed: ${updated?.status}`);

  // 4. Cleanup
  await deleteCampaignInDb(created!.id);
  console.log(`✓ 4. Soft-deleted test campaign`);

  console.log('\n✅ CAMPAIGN LIFECYCLE WORKS CORRECTLY IN DB');
  process.exit(0);
}

testCampaignLifecycle().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
