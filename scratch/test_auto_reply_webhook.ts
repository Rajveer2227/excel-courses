import { shouldSendAutoReply, recordAutoReplySent } from '../api/lib/db.js';
import { AUTO_REPLY_TEXT } from '../api/whatsapp/webhook.js';

async function testAutoReplyWebhook() {
  console.log('=== VERIFYING WHATSAPP INBOUND AUTO-REPLY ENGINE ===\n');

  const testPhone = '919876543210';
  const msgId1 = 'wamid.HBgL.test.101';
  const msgId2 = 'wamid.HBgL.test.102';

  // 1. Verify Auto-Reply Text Content
  console.log('✓ 1. Auto-Reply Text Format Verified:');
  console.log('--------------------------------------------------');
  console.log(AUTO_REPLY_TEXT);
  console.log('--------------------------------------------------\n');

  if (!AUTO_REPLY_TEXT.includes('+91 9156012360') || !AUTO_REPLY_TEXT.includes('only for sharing course information')) {
    throw new Error('Auto reply message text format mismatch!');
  }

  // 2. Test First Incoming Message (Should send auto reply)
  console.log('--- 2. First Incoming Message from Customer ---');
  const check1 = await shouldSendAutoReply(testPhone, msgId1);
  console.log(`First message check: shouldSend = ${check1.shouldSend}`);

  if (!check1.shouldSend) {
    throw new Error('First incoming message should trigger an auto-reply!');
  }

  // Simulate sending auto-reply
  await recordAutoReplySent(testPhone, msgId1);
  console.log('✓ 2. First message auto-reply recorded successfully.');

  // 3. Test Webhook Retry Idempotency (Same message ID sent again)
  console.log('\n--- 3. Testing Duplicate Webhook Event (Idempotency) ---');
  const checkDuplicate = await shouldSendAutoReply(testPhone, msgId1);
  console.log(`Duplicate check: shouldSend = ${checkDuplicate.shouldSend}, reason = "${checkDuplicate.reason}"`);

  if (checkDuplicate.shouldSend !== false || checkDuplicate.reason !== 'DUPLICATE_WEBHOOK_EVENT') {
    throw new Error('Idempotency check failed! Duplicate webhook event should be ignored.');
  }
  console.log('✓ 3. Duplicate Webhook Event ignored successfully.');

  // 4. Test Subsequent Incoming Messages within 24-Hour Window
  console.log('\n--- 4. Testing Subsequent Inbound Messages ("Fees?", "Admission", "👍") ---');
  const checkSubsequent = await shouldSendAutoReply(testPhone, msgId2);
  console.log(`Subsequent message check: shouldSend = ${checkSubsequent.shouldSend}, reason = "${checkSubsequent.reason}"`);

  if (checkSubsequent.shouldSend !== false || checkSubsequent.reason !== 'ALREADY_SENT_IN_24H_WINDOW') {
    throw new Error('Subsequent message check failed! System must remain silent for follow-up messages in 24h window.');
  }
  console.log('✓ 4. Subsequent inbound messages suppressed successfully (System remains silent).');

  console.log('\n✅ ALL AUTOMATIC REPLY VERIFICATION TESTS PASSED!');
  process.exit(0);
}

testAutoReplyWebhook().catch(err => {
  console.error('❌ Auto reply test failed:', err);
  process.exit(1);
});
