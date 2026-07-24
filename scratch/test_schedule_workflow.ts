import { scheduleCampaignInDb, unscheduleCampaignInDb, getCampaignByIdFromDb, createCampaignInDb, getCampaignsFromDb } from '../api/lib/db.js';

async function verifyScheduleWorkflow() {
  console.log('=== VERIFYING CAMPAIGN SCHEDULING WORKFLOW ===\n');

  // 1. Create a campaign
  const campaign = await createCampaignInDb({
    campaignName: 'Test Schedule Automation Drive',
    status: 'Draft',
    notes: 'Testing scheduling workflow end to end',
    tags: ['AutomatedTest'],
    rawContactsText: '9876543210',
    recipientStats: { validCount: 1, totalCount: 1, invalidCount: 0, duplicateCount: 0, skippedCount: 0, deliveredCount: 0, failedCount: 0 },
    parsedContacts: [{ phone: '9876543210', status: 'Pending' }]
  });

  if (!campaign) throw new Error('Failed to create campaign');
  console.log(`✓ 1. Campaign Created: ID = ${campaign.id}, Initial Status = ${campaign.status}`);

  // 2. Schedule Launch
  const schedulePayload = {
    scheduledDate: '2026-08-15',
    scheduledTime: '10:30',
    timezone: 'Asia/Kolkata (IST)',
    type: 'one_time'
  };

  const scheduled = await scheduleCampaignInDb(campaign.id, schedulePayload);
  if (!scheduled) throw new Error('Failed to schedule campaign');

  console.log(`✓ 2. Schedule Launch Executed`);
  console.log(`   - Status in DB: ${scheduled.status}`);
  console.log(`   - Scheduled At: ${scheduled.scheduledAt}`);
  console.log(`   - Schedule Settings: ${JSON.stringify(scheduled.scheduleSettings)}`);

  if (scheduled.status !== 'Scheduled') throw new Error('Status is not Scheduled!');
  if (!scheduled.scheduledAt) throw new Error('scheduledAt is null!');

  // 3. Verify in Dashboard Query
  const dbList = await getCampaignsFromDb({ status: 'Scheduled' });
  const foundInScheduled = dbList.data.find((c: any) => c.id === campaign.id);
  if (!foundInScheduled) throw new Error('Campaign not found under Scheduled filter!');
  console.log(`✓ 3. Verified Campaign appears under "Scheduled" tab/filter in Neon DB`);

  // 4. Unschedule Campaign
  const unscheduled = await unscheduleCampaignInDb(campaign.id);
  if (!unscheduled) throw new Error('Failed to unschedule campaign');
  console.log(`✓ 4. Unschedule Executed`);
  console.log(`   - Reverted Status in DB: ${unscheduled.status}`);
  console.log(`   - Scheduled At after unschedule: ${unscheduled.scheduledAt}`);

  if (unscheduled.status !== 'Draft') throw new Error('Status did not revert to Draft!');

  console.log('\n✅ ALL CAMPAIGN SCHEDULING WORKFLOW TESTS PASSED PERFECTLY!');
  process.exit(0);
}

verifyScheduleWorkflow().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
