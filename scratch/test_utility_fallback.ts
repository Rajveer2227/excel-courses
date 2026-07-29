import { WhatsAppDispatchEngine, DEFAULT_MARKETING_TEMPLATE, DEFAULT_UTILITY_TEMPLATE, type IWhatsAppProvider, type SendTextOptions, type SendTemplateOptions, type SendMediaOptions, type WhatsAppProviderResponse } from '../src/services/whatsappDispatchEngine.js';
import type { MediaItem } from '../src/data/shareData.js';

class MockUtilityFallbackProvider implements IWhatsAppProvider {
  public providerName = 'Mock Utility Fallback Provider';
  public callLogs: Array<{ action: string; toE164: string; templateName?: string; detail?: string }> = [];
  public failSendDocument = false;

  public async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppProviderResponse> {
    const tmplName = options.templateName || DEFAULT_MARKETING_TEMPLATE;
    this.callLogs.push({
      action: 'sendTemplate',
      toE164: options.toE164,
      templateName: tmplName,
      detail: `${options.headerMediaFilename} | ${options.courseTitle}`
    });
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
        error: 'Re-engagement message - customer care window not active.',
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

async function testUtilityFallback() {
  console.log('=== EVALUATING UTILITY TEMPLATE FALLBACK WORKFLOW ===\n');

  process.env.WHATSAPP_MARKETING_TEMPLATE = process.env.WHATSAPP_MARKETING_TEMPLATE || 'course_information_v2';
  process.env.WHATSAPP_UTILITY_TEMPLATE = process.env.WHATSAPP_UTILITY_TEMPLATE || 'course_information';

  const sampleMaterials: MediaItem[] = [
    { id: 'pdf-1', title: 'C Programming.pdf', previewUrl: 'https://blob/c.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-2', title: 'Java.pdf', previewUrl: 'https://blob/java.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-3', title: 'Python.pdf', previewUrl: 'https://blob/python.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false }
  ];

  const provider = new MockUtilityFallbackProvider();
  provider.failSendDocument = true; // Brand-new recipient scenario
  const engine = new WhatsAppDispatchEngine(provider);

  const res = await engine.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Priya Sharma',
    courseTitle: 'C Programming, Java, Python',
    textMessage: 'Hello Priya',
    selectedMaterials: sampleMaterials,
    context: 'swift_share',
    deliveryMode: 'guaranteed_delivery'
  });

  console.log('Dispatch Summary Stats:', {
    deliveredMediaCount: res.deliveredMediaCount,
    deliveredViaTemplateCount: res.deliveredViaTemplateCount,
    deliveredViaDocumentCount: res.deliveredViaDocumentCount
  });

  console.log('\nDetailed Message Execution Sequence:');
  provider.callLogs.forEach((log, idx) => {
    console.log(`  [Step ${idx + 1}] ${log.action} (${log.templateName ? `Template: ${log.templateName}` : 'Raw Doc'}) -> ${log.detail}`);
  });

  // Verify Step 1 is Marketing Template (course_information_v2)
  const step1 = provider.callLogs[0];
  if (step1.action !== 'sendTemplate' || step1.templateName !== 'course_information_v2') {
    throw new Error(`Step 1 must be Marketing Template "course_information_v2", got ${step1.templateName}`);
  }

  // Verify Fallback Step 3 is Approved Utility Template (course_information)
  const step3 = provider.callLogs[2];
  if (step3.action !== 'sendTemplate' || step3.templateName !== 'course_information') {
    throw new Error(`Fallback Step 3 must be Approved Utility Template "course_information", got ${step3.templateName}`);
  }

  // Verify Fallback Step 5 is Approved Utility Template (course_information)
  const step5 = provider.callLogs[4];
  if (step5.action !== 'sendTemplate' || step5.templateName !== 'course_information') {
    throw new Error(`Fallback Step 5 must be Approved Utility Template "course_information", got ${step5.templateName}`);
  }

  console.log('\n✓ PDF #1 correctly delivered via Marketing Template (course_information_v2)');
  console.log('✓ PDF #2 & #3 correctly delivered via Approved Utility Template (course_information)');
  console.log('\n✅ UTILITY TEMPLATE FALLBACK EVALUATION & VERIFICATION PASSED!');
  process.exit(0);
}

testUtilityFallback().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
