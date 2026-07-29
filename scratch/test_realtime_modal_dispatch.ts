import { WhatsAppDispatchEngine, type IWhatsAppProvider, type SendTextOptions, type SendTemplateOptions, type SendMediaOptions, type WhatsAppProviderResponse, type DispatchProgressPayload } from '../src/services/whatsappDispatchEngine.js';
import type { MediaItem } from '../src/data/shareData.js';

class MockRealTimeProvider implements IWhatsAppProvider {
  public providerName = 'Mock Real-Time Provider';

  public async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-tmpl-${Date.now()}` };
  }

  public async sendText(options: SendTextOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-txt-${Date.now()}` };
  }

  public async sendDocument(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    if (options.filename.includes('CustomerWindowFail')) {
      return {
        success: false,
        error: 'Re-engagement message - customer care window is not active.',
        code: '131047',
        statusCode: 400
      };
    }
    return { success: true, messageId: `mock-doc-${Date.now()}` };
  }

  public async sendImage(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-img-${Date.now()}` };
  }

  public async sendVideo(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-vid-${Date.now()}` };
  }
}

async function testRealTimeDispatchModalEvents() {
  console.log('=== VERIFYING REAL-TIME EVENT-DRIVEN DISPATCH PROGRESS ENGINE ===\n');

  const materials: MediaItem[] = [
    { id: 'pdf-1', title: 'C Programming.pdf', previewUrl: 'https://blob/c.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-2', title: 'CustomerWindowFail_Java.pdf', previewUrl: 'https://blob/java.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-3', title: 'Python.pdf', previewUrl: 'https://blob/python.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false }
  ];

  const emittedEvents: DispatchProgressPayload[] = [];
  const provider = new MockRealTimeProvider();
  const engine = new WhatsAppDispatchEngine(provider);

  const result = await engine.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Rajveer',
    courseTitle: 'C Programming, Java, Python',
    textMessage: 'Hello Rajveer',
    selectedMaterials: materials,
    context: 'swift_share',
    onProgress: (payload) => {
      emittedEvents.push({ ...payload });
      console.log(`[EventEmitted] ${payload.event.padEnd(25)} | ${String(payload.progressPercent).padStart(3)}% | ${payload.message} (${payload.description})`);
    }
  });

  console.log('\n--- VERIFYING EVENT MILESTONES ---');
  const eventTypes = emittedEvents.map(e => e.event);

  if (!eventTypes.includes('PREPARING')) throw new Error('Missing PREPARING event!');
  if (!eventTypes.includes('QUEUE_READY')) throw new Error('Missing QUEUE_READY event!');
  if (!eventTypes.includes('MARKETING_TEMPLATE_SENT')) throw new Error('Missing MARKETING_TEMPLATE_SENT event!');
  if (!eventTypes.includes('UTILITY_FALLBACK')) throw new Error('Missing UTILITY_FALLBACK event for CustomerWindowFail!');
  if (!eventTypes.includes('UTILITY_TEMPLATE_SENT')) throw new Error('Missing UTILITY_TEMPLATE_SENT event!');
  if (!eventTypes.includes('AUDIT_COMPLETE')) throw new Error('Missing AUDIT_COMPLETE event!');
  if (!eventTypes.includes('DISPATCH_COMPLETE')) throw new Error('Missing DISPATCH_COMPLETE event!');

  const finalProgress = emittedEvents[emittedEvents.length - 1];
  if (finalProgress.progressPercent !== 100) {
    throw new Error(`Final progress must be 100%, got ${finalProgress.progressPercent}%`);
  }

  console.log('✓ All 7 Dispatch Progress Milestones Emitted Correctly!');
  console.log('✓ Final Progress strictly 100% upon completion.');
  console.log('\n✅ REAL-TIME DISPATCH PROGRESS ENGINE VERIFICATION PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

testRealTimeDispatchModalEvents().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
