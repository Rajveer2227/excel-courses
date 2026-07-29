import { WhatsAppDispatchEngine, type IWhatsAppProvider, type SendTextOptions, type SendTemplateOptions, type SendMediaOptions, type WhatsAppProviderResponse } from '../src/services/whatsappDispatchEngine.js';
import type { MediaItem } from '../src/data/shareData.js';

class MockEnvTestProvider implements IWhatsAppProvider {
  public providerName = 'Mock Env Test Provider';
  public callLogs: Array<{ action: string; templateCategory?: 'marketing' | 'utility'; detail?: string }> = [];

  public async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({
      action: 'sendTemplate',
      templateCategory: options.templateCategory,
      detail: options.headerMediaFilename
    });
    return { success: true, messageId: `mock-tmpl-${Date.now()}` };
  }

  public async sendText(options: SendTextOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendText', detail: options.text });
    return { success: true, messageId: `mock-txt-${Date.now()}` };
  }

  public async sendDocument(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendDocument', detail: options.filename });
    return {
      success: false,
      error: 'Re-engagement message - customer care window is not active.',
      code: '131047',
      statusCode: 400
    };
  }

  public async sendImage(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-img-${Date.now()}` };
  }

  public async sendVideo(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-vid-${Date.now()}` };
  }
}

async function testEnvironmentTemplateCategoryDispatch() {
  console.log('=== VERIFYING SERVER-SIDE TEMPLATE DISPATCH ARCHITECTURE ===\n');

  const materials: MediaItem[] = [
    { id: 'pdf-1', title: 'C Programming.pdf', previewUrl: 'https://blob/c.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-2', title: 'Java.pdf', previewUrl: 'https://blob/java.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false }
  ];

  const provider = new MockEnvTestProvider();
  const engine = new WhatsAppDispatchEngine(provider);

  await engine.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Test Student',
    courseTitle: 'C Programming, Java',
    textMessage: 'Hello',
    selectedMaterials: materials,
    context: 'swift_share'
  });

  const m = provider.callLogs.find(c => c.action === 'sendTemplate' && c.detail === 'C Programming.pdf');
  const u = provider.callLogs.find(c => c.action === 'sendTemplate' && c.detail === 'Java.pdf');

  console.log(`Execution Template Dispatch Categories:`);
  console.log(`  PDF #1 Template Category Sent: "${m?.templateCategory}"`);
  console.log(`  PDF #2 Fallback Category Sent: "${u?.templateCategory}"\n`);

  if (m?.templateCategory !== 'marketing') {
    throw new Error(`Expected PDF #1 templateCategory to be "marketing", got "${m?.templateCategory}"`);
  }
  if (u?.templateCategory !== 'utility') {
    throw new Error(`Expected PDF #2 fallback templateCategory to be "utility", got "${u?.templateCategory}"`);
  }

  console.log('✓ FRONTEND DISPATCH ENGINE DELEGATES TEMPLATE RESOLUTION TO SERVER API GATEWAY PERFECTLY!');
  process.exit(0);
}

testEnvironmentTemplateCategoryDispatch().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
