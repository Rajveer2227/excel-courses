import { WhatsAppDispatchEngine, type IWhatsAppProvider, type SendTextOptions, type SendTemplateOptions, type SendMediaOptions, type WhatsAppProviderResponse } from '../src/services/whatsappDispatchEngine.js';
import type { MediaItem } from '../src/data/shareData.js';

class MockAutomaticDispatchProvider implements IWhatsAppProvider {
  public providerName = 'Mock Automatic Dispatch Provider';
  public callLogs: Array<{ action: string; toE164: string; templateCategory?: 'marketing' | 'utility'; detail?: string }> = [];
  public failRawDocument = false;

  public async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppProviderResponse> {
    const tmplCategory = options.templateCategory || 'marketing';
    this.callLogs.push({
      action: 'sendTemplate',
      toE164: options.toE164,
      templateCategory: tmplCategory,
      detail: `Header: ${options.headerMediaFilename} | {{1}}: ${options.studentName} | {{2}}: ${options.courseTitle}`
    });
    return { success: true, messageId: `mock-tmpl-${Date.now()}` };
  }

  public async sendText(options: SendTextOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendText', toE164: options.toE164, detail: options.text });
    return { success: true, messageId: `mock-txt-${Date.now()}` };
  }

  public async sendDocument(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendDocument', toE164: options.toE164, detail: options.filename });
    if (this.failRawDocument) {
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
    this.callLogs.push({ action: 'sendImage', toE164: options.toE164, detail: options.caption });
    return { success: true, messageId: `mock-img-${Date.now()}` };
  }

  public async sendVideo(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.callLogs.push({ action: 'sendVideo', toE164: options.toE164, detail: options.caption });
    return { success: true, messageId: `mock-vid-${Date.now()}` };
  }
}

async function runVerificationChecklist() {
  console.log('=== AUTOMATIC UTILITY FALLBACK DISPATCH VERIFICATION ===\n');

  process.env.WHATSAPP_MARKETING_TEMPLATE = process.env.WHATSAPP_MARKETING_TEMPLATE || 'course_information_v2';
  process.env.WHATSAPP_UTILITY_TEMPLATE = process.env.WHATSAPP_UTILITY_TEMPLATE || 'course_information';

  const materials: MediaItem[] = [
    { id: 'pdf-1', title: 'C Programming.pdf', previewUrl: 'https://blob/c.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-2', title: 'Advanced Java.pdf', previewUrl: 'https://blob/java.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-3', title: 'Python Data Science.pdf', previewUrl: 'https://blob/python.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false }
  ];

  // ----------------------------------------------------
  // SCENARIO 1: Single Course Selected
  // ----------------------------------------------------
  console.log('--- SCENARIO 1: Single Course Dispatch ---');
  const provider1 = new MockAutomaticDispatchProvider();
  const engine1 = new WhatsAppDispatchEngine(provider1);

  const res1 = await engine1.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Amit Shah',
    courseTitle: 'C Programming',
    textMessage: 'Hello Amit',
    selectedMaterials: [materials[0]],
    context: 'swift_share'
  });

  console.log('Scenario 1 Calls:', provider1.callLogs);
  if (provider1.callLogs.length !== 1 || provider1.callLogs[0].templateCategory !== 'marketing') {
    throw new Error('Single course must send ONLY 1 Marketing Template!');
  }
  console.log('✓ Scenario 1 Verified: Single course uses ONLY 1 Marketing Template.\n');

  // ----------------------------------------------------
  // SCENARIO 2: Multi-Course with Active Customer Care Window (Existing Recipient)
  // ----------------------------------------------------
  console.log('--- SCENARIO 2: Multi-Course Existing Recipient (Active Window) ---');
  const provider2 = new MockAutomaticDispatchProvider();
  provider2.failRawDocument = false; // Active window -> raw documents succeed!
  const engine2 = new WhatsAppDispatchEngine(provider2);

  const res2 = await engine2.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Priya Sharma',
    courseTitle: 'C Programming, Advanced Java, Python Data Science',
    textMessage: 'Hello Priya',
    selectedMaterials: materials,
    context: 'swift_share'
  });

  console.log('Scenario 2 Stats:', {
    deliveredMediaCount: res2.deliveredMediaCount,
    deliveredViaMarketingCount: res2.deliveredViaMarketingCount,
    deliveredViaDocumentCount: res2.deliveredViaDocumentCount,
    deliveredViaUtilityCount: res2.deliveredViaUtilityCount
  });
  console.log('Scenario 2 Calls:', provider2.callLogs);

  if (res2.deliveredViaMarketingCount !== 1 || res2.deliveredViaDocumentCount !== 2 || res2.deliveredViaUtilityCount !== 0) {
    throw new Error('Existing recipient must deliver 1 Marketing Template + 2 Raw Documents!');
  }
  console.log('✓ Scenario 2 Verified: Existing recipient sends 1 Marketing Template + Raw Documents.\n');

  // ----------------------------------------------------
  // SCENARIO 3: Multi-Course Brand-New Recipient (No Active 24h Window)
  // ----------------------------------------------------
  console.log('--- SCENARIO 3: Multi-Course Brand-New Recipient (Automatic Utility Fallback) ---');
  const provider3 = new MockAutomaticDispatchProvider();
  provider3.failRawDocument = true; // Brand-new recipient -> raw document rejected with 131047!
  const engine3 = new WhatsAppDispatchEngine(provider3);

  const res3 = await engine3.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Rohan Patil',
    courseTitle: 'C Programming, Advanced Java, Python Data Science',
    textMessage: 'Hello Rohan',
    selectedMaterials: materials,
    context: 'swift_share'
  });

  console.log('Scenario 3 Stats:', {
    deliveredMediaCount: res3.deliveredMediaCount,
    deliveredViaMarketingCount: res3.deliveredViaMarketingCount,
    deliveredViaDocumentCount: res3.deliveredViaDocumentCount,
    deliveredViaUtilityCount: res3.deliveredViaUtilityCount
  });
  console.log('Scenario 3 Calls:');
  provider3.callLogs.forEach((log, idx) => {
    console.log(`  [Step ${idx + 1}] ${log.action} (${log.templateName ? `Template: ${log.templateName}` : 'Raw Doc'}) -> ${log.detail}`);
  });

  if (res3.deliveredViaMarketingCount !== 1 || res3.deliveredViaUtilityCount !== 2) {
    throw new Error('New recipient must deliver 1 Marketing Template + 2 Utility Template Fallbacks!');
  }

  // Verify Template Categories
  if (provider3.callLogs[0].templateCategory !== 'marketing') {
    throw new Error('Step 1 template category must be "marketing"!');
  }
  if (provider3.callLogs[2].templateCategory !== 'utility') {
    throw new Error('Fallback Step 3 template category must be "utility"!');
  }
  if (provider3.callLogs[4].templateCategory !== 'utility') {
    throw new Error('Fallback Step 5 template category must be "utility"!');
  }

  // Verify Variables
  if (!provider3.callLogs[0].detail?.includes('{{2}}: C Programming')) {
    throw new Error('Marketing template variable {{2}} must be First Course Name "C Programming"!');
  }
  if (!provider3.callLogs[2].detail?.includes('{{2}}: Advanced Java')) {
    throw new Error('Utility fallback #2 variable {{2}} must be Current Course Name "Advanced Java"!');
  }
  if (!provider3.callLogs[4].detail?.includes('{{2}}: Python Data Science')) {
    throw new Error('Utility fallback #3 variable {{2}} must be Current Course Name "Python Data Science"!');
  }

  console.log('✓ Scenario 3 Verified: Brand-new recipient automatically falls back to Utility Templates (multiple_course_information) with exact variables.\n');

  console.log('✅ ALL VERIFICATION CHECKLIST ITEMS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runVerificationChecklist().catch(err => {
  console.error('❌ Verification test failed:', err);
  process.exit(1);
});
