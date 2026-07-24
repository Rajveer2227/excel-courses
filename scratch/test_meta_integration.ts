import { validateWhatsAppConfig, getWhatsAppConfig } from '../api/lib/whatsappConfig.js';
import { resolvePublicMediaUrl } from '../src/utils/mediaUrlResolver.js';
import { WhatsAppDispatchEngine, MetaWhatsAppProvider } from '../src/services/whatsappDispatchEngine.js';
import type { MediaItem } from '../src/data/shareData.js';

async function testMetaIntegration() {
  console.log('=== VERIFYING META WHATSAPP CLOUD API PRODUCTION INTEGRATION ===\n');

  // 1. Test Environment Credentials Validator
  console.log('--- 1. Environment Credentials Validator ---');
  const validation = validateWhatsAppConfig();
  console.log(`Config Valid: ${validation.isValid ? 'YES' : 'NO (Expected in dev without .env.local secrets)'}`);
  if (validation.errors.length > 0) {
    console.log('Validation Notices:', validation.errors);
  }
  const config = getWhatsAppConfig();
  console.log(`Graph API Target Endpoint: "${config.graphApiBaseUrl}"`);
  console.log(`Public Origin: "${config.appPublicUrl}"`);

  // 2. Test Media URL Resolver
  console.log('\n--- 2. Public Media URL Resolver ---');
  const res1 = resolvePublicMediaUrl('/assets/materials/c-syllabus.pdf');
  console.log('Relative path resolution:', res1.url);
  if (!res1.url.startsWith('https://')) {
    throw new Error(`Media URL resolution failed to generate HTTPS URL! Got: ${res1.url}`);
  }

  const res2 = resolvePublicMediaUrl('https://my-bucket.s3.amazonaws.com/flyer.png');
  console.log('Full S3 URL resolution:', res2.url);
  if (res2.url !== 'https://my-bucket.s3.amazonaws.com/flyer.png') {
    throw new Error('Public S3 URL altered incorrectly!');
  }

  // 3. Test Full Provider Dispatch Pipeline
  console.log('\n--- 3. Full Dispatch Pipeline via MetaWhatsAppProvider ---');
  const provider = new MetaWhatsAppProvider();
  const engine = new WhatsAppDispatchEngine(provider);

  const sampleMaterials: MediaItem[] = [
    { id: 'mat-1', title: 'Advanced Java Syllabus.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1.2 MB', courseIds: ['ALL'], uploadDate: '2026-07-24', isFavorite: false },
    { id: 'mat-2', title: 'Campus Poster.png', fileType: 'image', category: 'Flyer', fileSize: '500 KB', courseIds: ['ALL'], uploadDate: '2026-07-24', isFavorite: false }
  ];

  const dispatchResult = await engine.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Rohan Patil',
    courseTitle: 'Advanced Java',
    textMessage: 'Hello Rohan, Thank you for contacting Excel Computers.',
    selectedMaterials: sampleMaterials,
    context: 'swift_share'
  });

  console.log('Dispatch Success:', dispatchResult.success);
  console.log('Text Message WAMID:', dispatchResult.textMessageId);
  console.log('Delivered Media Count:', dispatchResult.deliveredMediaCount);

  if (!dispatchResult.success) {
    throw new Error(`Dispatch failed: ${dispatchResult.error}`);
  }

  if (!dispatchResult.textMessageId || !dispatchResult.textMessageId.startsWith('wamid.')) {
    throw new Error(`Invalid WAMID returned: ${dispatchResult.textMessageId}`);
  }

  console.log('\n✅ ALL META WHATSAPP CLOUD API INTEGRATION TESTS PASSED!');
  process.exit(0);
}

testMetaIntegration().catch(err => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
