import { WhatsAppDispatchEngine, MetaWhatsAppProvider, type IWhatsAppProvider, type SendTextOptions, type SendMediaOptions, type WhatsAppProviderResponse } from '../src/services/whatsappDispatchEngine.js';
import type { MediaItem } from '../src/data/shareData.js';

class MockTestWhatsAppProvider implements IWhatsAppProvider {
  public providerName = 'Mock Test Provider';
  public callLogs: Array<{ action: string; toE164: string; detail?: string }> = [];
  public shouldFailText = false;
  public shouldFailMediaId: string | null = null;

  public async sendText(options: SendTextOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendText', toE164: options.toE164, detail: options.text });
    if (this.shouldFailText) {
      return { success: false, error: 'Simulated Text Failure' };
    }
    return { success: true, messageId: `mock-text-${Date.now()}` };
  }

  public async sendDocument(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendDocument', toE164: options.toE164, detail: options.filename });
    if (this.shouldFailMediaId === options.filename) {
      return { success: false, error: 'Simulated Document Failure' };
    }
    return { success: true, messageId: `mock-doc-${Date.now()}` };
  }

  public async sendImage(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendImage', toE164: options.toE164, detail: options.caption });
    return { success: true, messageId: `mock-img-${Date.now()}` };
  }

  public async sendVideo(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendVideo', toE164: options.toE164, detail: options.caption });
    return { success: true, messageId: `mock-video-${Date.now()}` };
  }
}

async function testDispatchEngineFoundation() {
  console.log('=== VERIFYING WHATSAPP DISPATCH ENGINE ARCHITECTURE ===\n');

  const mockProvider = new MockTestWhatsAppProvider();
  const engine = new WhatsAppDispatchEngine(mockProvider);

  // 1. Verify Provider Abstraction Binding
  console.log(`✓ 1. Provider bound: "${engine.getProvider().providerName}"`);
  if (engine.getProvider().providerName !== 'Mock Test Provider') {
    throw new Error('Provider abstraction binding failed');
  }

  // Sample materials
  const sampleMaterials: MediaItem[] = [
    { id: 'mat-1', title: 'Advanced Java Syllabus', fileType: 'pdf', category: 'Syllabus', fileSize: '1.2 MB', courseIds: ['ALL'], uploadDate: '2026-07-24', isFavorite: false },
    { id: 'mat-2', title: 'Campus Brochure Photo', fileType: 'image', category: 'Flyer', fileSize: '800 KB', courseIds: ['ALL'], uploadDate: '2026-07-24', isFavorite: false }
  ];

  // 2. Execute Dispatch Pipeline
  console.log('\n--- 2. Executing Sequential Dispatch Pipeline ---');
  const progressLogs: string[] = [];

  const result = await engine.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Priya Sharma',
    courseTitle: 'Advanced Java Bootcamp',
    textMessage: 'Hello Priya, Thank you for contacting Excel Computers.',
    selectedMaterials: sampleMaterials,
    context: 'swift_share',
    onProgress: (p) => progressLogs.push(`${p.state}: ${p.message}`)
  });

  console.log('Progress Logs:', progressLogs);
  console.log('Call Order Executed by Engine:');
  mockProvider.callLogs.forEach((log, idx) => {
    console.log(`  [Step ${idx + 1}] ${log.action} -> ${log.toE164} (${log.detail})`);
  });

  // Verify Phone Normalization E.164
  if (mockProvider.callLogs[0].toE164 !== '+919823045678') {
    throw new Error(`Phone normalization failed! Expected +919823045678, got ${mockProvider.callLogs[0].toE164}`);
  }
  console.log('\n✓ 3. Phone normalization verified: +919823045678');

  // Verify Text Sent First
  if (mockProvider.callLogs[0].action !== 'sendText') {
    throw new Error('Text message was not sent first!');
  }
  console.log('✓ 4. Text message was sent FIRST before media items');

  // Verify Sequential Order (Text -> Doc 1 -> Image 2)
  if (mockProvider.callLogs[1].action !== 'sendDocument' || mockProvider.callLogs[2].action !== 'sendImage') {
    throw new Error('Sequential media delivery order violated!');
  }
  console.log('✓ 5. Sequential media delivery order verified (Doc 1 -> Image 2)');

  // 3. Test Circuit Breaker (Text Failure Stops Media)
  console.log('\n--- 3. Testing Error Circuit Breaker ---');
  const failMockProvider = new MockTestWhatsAppProvider();
  failMockProvider.shouldFailText = true;
  const failEngine = new WhatsAppDispatchEngine(failMockProvider);

  const failResult = await failEngine.executeDispatch({
    recipientPhone: '9422411223',
    studentName: 'Amit Kumar',
    courseTitle: 'Full Stack Web Dev',
    textMessage: 'Hello Amit',
    selectedMaterials: sampleMaterials,
    context: 'swift_share'
  });

  console.log(`Text Fail Result: Success = ${failResult.success}, Error = "${failResult.error}"`);
  console.log(`Provider Calls Made: ${failMockProvider.callLogs.length}`);

  if (failResult.success !== false || failMockProvider.callLogs.length !== 1) {
    throw new Error('Circuit breaker failed! Engine should stop immediately when text message fails.');
  }
  console.log('✓ 6. Error Circuit Breaker verified (Text failure halts media sending)');

  console.log('\n✅ ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

testDispatchEngineFoundation().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
