import { scheduleCampaignInDb, checkDueScheduledCampaignsInDb, getCampaignByIdFromDb, createCampaignInDb } from '../api/lib/db.js';

async function verifyAutoLaunchEngine() {
  console.log('=== VERIFYING AUTOMATIC SCHEDULED CAMPAIGN LAUNCH ENGINE ===\n');

  // 1. Create a campaign
  const campaign = await createCampaignInDb({
    campaignName: 'Auto Launch Test Drive',
    status: 'Draft',
    notes: 'Testing auto-launch when scheduled time passes',
    tags: ['AutoLaunchTest'],
    rawContactsText: '9876543210',
    recipientStats: { validCount: 1, totalCount: 1, invalidCount: 0, duplicateCount: 0, skippedCount: 0, deliveredCount: 0, failedCount: 0 },
    parsedContacts: [{ phone: '9876543210', status: 'Pending' }]
  });

  if (!campaign) throw new Error('Failed to create test campaign');
  console.log(`✓ 1. Campaign Created: ID = ${campaign.id}`);

  // 2. Schedule for 1 minute in the PAST (e.g. 2026-07-23 20:10)
  const pastDateStr = '2026-07-23';
  const pastTimeStr = '20:10';
  const scheduled = await scheduleCampaignInDb(campaign.id, {
    scheduledDate: pastDateStr,
    scheduledTime: pastTimeStr,
    timezone: 'Asia/Kolkata (IST)',
    type: 'one_time'
  });

  console.log(`✓ 2. Campaign Scheduled for PAST time: ${pastDateStr} ${pastTimeStr}`);
  console.log(`   - Status in DB: ${scheduled?.status}`);

  // 3. Trigger checkDueScheduledCampaignsInDb()
  const dueList = await checkDueScheduledCampaignsInDb();
  console.log(`✓ 3. Ticker evaluated due scheduled campaigns. Found: ${dueList.length} due campaign(s)`);

  // 4. Verify status in DB transitioned to Running
  const updatedInDb = await getCampaignByIdFromDb(campaign.id);
  console.log(`✓ 4. Campaign status after ticker check: ${updatedInDb?.status}`);

  if (updatedInDb?.status !== 'Running') {
    throw new Error(`Campaign status should be Running, but got: ${updatedInDb?.status}`);
  }

  console.log('\n✅ AUTOMATIC SCHEDULED LAUNCH ENGINE VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

verifyAutoLaunchEngine().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
