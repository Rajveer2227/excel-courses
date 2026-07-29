import { getAppSettingFromDb, setAppSettingInDb } from '../api/lib/db.js';

async function testGlobalSettings() {
  console.log('=== VERIFYING GLOBAL APPLICATION SETTINGS PERSISTENCE ===\n');

  // 1. Initial setting lookup
  const initialMode = await getAppSettingFromDb('swift_share_delivery_mode', 'cost_optimized');
  console.log(`Initial DB setting for "swift_share_delivery_mode": "${initialMode}"`);

  // 2. Update to Guaranteed Delivery
  console.log('\nUpdating setting to "guaranteed_delivery"...');
  const updateRes = await setAppSettingInDb('swift_share_delivery_mode', 'guaranteed_delivery');
  console.log('Update Result:', updateRes);

  // 3. Re-query setting from DB
  const updatedMode = await getAppSettingFromDb('swift_share_delivery_mode', 'cost_optimized');
  console.log(`Updated DB setting fetched: "${updatedMode}"`);

  if (updatedMode !== 'guaranteed_delivery') {
    throw new Error(`Expected setting "guaranteed_delivery", got "${updatedMode}"`);
  }

  // 4. Revert back to cost_optimized
  console.log('\nReverting setting back to "cost_optimized"...');
  await setAppSettingInDb('swift_share_delivery_mode', 'cost_optimized');
  const finalMode = await getAppSettingFromDb('swift_share_delivery_mode', 'cost_optimized');
  console.log(`Final DB setting fetched: "${finalMode}"`);

  if (finalMode !== 'cost_optimized') {
    throw new Error(`Expected setting "cost_optimized", got "${finalMode}"`);
  }

  console.log('\n✅ GLOBAL APPLICATION SETTINGS PERSISTENCE VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

testGlobalSettings().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
