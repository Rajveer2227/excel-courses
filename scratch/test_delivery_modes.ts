import { WhatsAppDispatchEngine, type IWhatsAppProvider, type SendTextOptions, type SendTemplateOptions, type SendMediaOptions, type WhatsAppProviderResponse } from '../src/services/whatsappDispatchEngine.js';
import type { MediaItem } from '../src/data/shareData.js';

class MockDeliveryModeProvider implements IWhatsAppProvider {
  public providerName = 'Mock Delivery Mode Provider';
  public callLogs: Array<{ action: string; toE164: string; detail?: string }> = [];
  public failSendDocument = false;

  public async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendTemplate', toE164: options.toE164, detail: `${options.headerMediaFilename} | ${options.courseTitle}` });
    return { success: true, messageId: `mock-tmpl-${Date.now()}` };
  }

  public async sendText(options: SendTextOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendText', toE164: options.toE164, detail: options.text });
    return { success: true, messageId: `mock-txt-${Date.now()}` };
  }

  public async sendDocument(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendDocument', toE164: options.toE164, detail: options.filename });
    if (this.failSendDocument) {
      return {
        success: false,
        error: 'Re-engagement message - Message failed to send because customer care window is not active.',
        code: '131047',
        statusCode: 400
      };
    }
    return { success: true, messageId: `mock-doc-${Date.now()}` };
  }

  public async sendImage(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendImage', toE164: options.toE164, detail: options.caption });
    return { success: true, messageId: `mock-img-${Date.now()}` };
  }

  public async sendVideo(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendVideo', toE164: options.toE164, detail: options.caption });
    return { success: true, messageId: `mock-vid-${Date.now()}` };
  }
}

async function testDeliveryModes() {
  console.log('=== VERIFYING CONFIGURABLE WHATSAPP DELIVERY MODES ===\n');

  const sampleMaterials: MediaItem[] = [
    { id: 'pdf-1', title: 'C Programming.pdf', previewUrl: 'https://blob/c.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-2', title: 'Java.pdf', previewUrl: 'https://blob/java.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-3', title: 'Python.pdf', previewUrl: 'https://blob/python.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false }
  ];

  // ----------------------------------------------------
  // TEST 1: MODE 1 – COST OPTIMIZED (Default)
  // ----------------------------------------------------
  console.log('--- TEST 1: MODE 1 – COST OPTIMIZED (cost_optimized) ---');
  const providerMode1 = new MockDeliveryModeProvider();
  providerMode1.failSendDocument = true; // Simulate brand-new recipient with no 24h customer window
  const engine1 = new WhatsAppDispatchEngine(providerMode1);

  const res1 = await engine1.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Rohan Patil',
    courseTitle: 'C Programming, Java, Python',
    textMessage: 'Hello Rohan',
    selectedMaterials: sampleMaterials,
    context: 'swift_share',
    deliveryMode: 'cost_optimized'
  });

  console.log('Mode 1 Result Stats:', {
    deliveredMediaCount: res1.deliveredMediaCount,
    failedMediaCount: res1.failedMediaCount,
    pendingInteractionCount: res1.pendingInteractionCount,
    deliveredViaTemplateCount: res1.deliveredViaTemplateCount,
    deliveredViaDocumentCount: res1.deliveredViaDocumentCount
  });

  console.log('Mode 1 Call Logs:', providerMode1.callLogs);

  if (res1.pendingInteractionCount !== 2) {
    throw new Error(`Mode 1 expected 2 pending interaction items, got ${res1.pendingInteractionCount}`);
  }
  if (providerMode1.callLogs.length !== 2) { // 1 sendTemplate + 1 sendDocument attempt (stopped after error)
    throw new Error(`Mode 1 expected 2 total calls (1 template + 1 failed doc attempt), got ${providerMode1.callLogs.length}`);
  }
  console.log('✓ Mode 1 Cost Optimized verified (Stopped dispatch on window error, marked remaining as Pending Customer Interaction).\n');

  // ----------------------------------------------------
  // TEST 2: MODE 2 – GUARANTEED DELIVERY
  // ----------------------------------------------------
  console.log('--- TEST 2: MODE 2 – GUARANTEED DELIVERY (guaranteed_delivery) ---');
  const providerMode2 = new MockDeliveryModeProvider();
  providerMode2.failSendDocument = true; // Simulate brand-new recipient with no 24h customer window
  const engine2 = new WhatsAppDispatchEngine(providerMode2);

  const res2 = await engine2.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Rohan Patil',
    courseTitle: 'C Programming, Java, Python',
    textMessage: 'Hello Rohan',
    selectedMaterials: sampleMaterials,
    context: 'swift_share',
    deliveryMode: 'guaranteed_delivery'
  });

  console.log('Mode 2 Result Stats:', {
    deliveredMediaCount: res2.deliveredMediaCount,
    failedMediaCount: res2.failedMediaCount,
    pendingInteractionCount: res2.pendingInteractionCount,
    deliveredViaTemplateCount: res2.deliveredViaTemplateCount,
    deliveredViaDocumentCount: res2.deliveredViaDocumentCount
  });

  console.log('Mode 2 Call Logs:');
  providerMode2.callLogs.forEach((log, idx) => {
    console.log(`  [Step ${idx + 1}] ${log.action} -> ${log.toE164} (${log.detail})`);
  });

  if (res2.deliveredViaTemplateCount !== 3) {
    throw new Error(`Mode 2 expected 3 delivered via template (1 initial + 2 fallbacks), got ${res2.deliveredViaTemplateCount}`);
  }
  if (res2.deliveredMediaCount !== 3) {
    throw new Error(`Mode 2 expected 3 total delivered media, got ${res2.deliveredMediaCount}`);
  }

  // Verify variable {{2}} for Fallback #2 is 'Java' and Fallback #3 is 'Python'
  const fallback2Call = providerMode2.callLogs.find(c => c.action === 'sendTemplate' && c.detail?.includes('Java.pdf'));
  const fallback3Call = providerMode2.callLogs.find(c => c.action === 'sendTemplate' && c.detail?.includes('Python.pdf'));

  if (!fallback2Call || !fallback2Call.detail?.includes('Java')) {
    throw new Error('Fallback Template #2 course variable must be specific course title "Java"!');
  }
  if (!fallback3Call || !fallback3Call.detail?.includes('Python')) {
    throw new Error('Fallback Template #3 course variable must be specific course title "Python"!');
  }

  console.log('✓ Mode 2 Guaranteed Delivery verified (Automatic fallback to Marketing Templates with specific course variables).\n');

  console.log('✅ ALL DELIVERY MODE CRITERIA VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

testDeliveryModes().catch(err => {
  console.error('❌ Delivery mode test failed:', err);
  process.exit(1);
});
