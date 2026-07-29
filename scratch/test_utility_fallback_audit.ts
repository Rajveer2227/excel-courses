import { WhatsAppDispatchEngine, type IWhatsAppProvider, type SendTextOptions, type SendTemplateOptions, type SendMediaOptions, type WhatsAppProviderResponse } from '../src/services/whatsappDispatchEngine';
import type { MediaItem } from '../src/data/shareData';

class MockProductionProvider implements IWhatsAppProvider {
  public providerName = 'Mock Production Provider';
  public apiCalls: Array<{ action: string; category?: string; header?: string; course?: string }> = [];

  public async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppProviderResponse> {
    this.apiCalls.push({
      action: 'sendTemplate',
      category: options.templateCategory || 'marketing',
      header: options.headerMediaFilename,
      course: options.courseTitle
    });
    return { success: true, messageId: `wamid.tmpl.${Date.now()}.${Math.random()}` };
  }

  public async sendText(options: SendTextOptions): Promise<WhatsAppProviderResponse> {
    this.apiCalls.push({ action: 'sendText' });
    return { success: true, messageId: `wamid.txt.${Date.now()}` };
  }

  public async sendDocument(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    this.apiCalls.push({ action: 'sendDocument', header: options.filename });
    return { success: true, messageId: `wamid.doc.${Date.now()}` };
  }

  public async sendImage(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `wamid.img.${Date.now()}` };
  }

  public async sendVideo(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `wamid.vid.${Date.now()}` };
  }
}

async function testSwiftShareOutboundScenarios() {
  console.log('=== VERIFYING SWIFT SHARE OUTBOUND MARKETING DISPATCH SCENARIOS ===\n');

  const pdf1: MediaItem = { id: 'pdf-1', title: 'C Programming.pdf', previewUrl: 'https://blob/c.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false };
  const pdf2: MediaItem = { id: 'pdf-2', title: 'C++ Programming.pdf', previewUrl: 'https://blob/cpp.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false };
  const pdf3: MediaItem = { id: 'pdf-3', title: 'Core Java.pdf', previewUrl: 'https://blob/java.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false };
  const pdf4: MediaItem = { id: 'pdf-4', title: 'Python Data Science.pdf', previewUrl: 'https://blob/python.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false };

  // --- SCENARIO 1: 1 Course Selected ---
  console.log('--- TEST 1: 1 Course Selected ---');
  const p1 = new MockProductionProvider();
  const e1 = new WhatsAppDispatchEngine(p1);
  const r1 = await e1.executeDispatch({
    recipientPhone: '+919823045678',
    studentName: 'Amit Shah',
    courseTitle: 'C Programming',
    textMessage: 'Hello',
    selectedMaterials: [pdf1],
    context: 'swift_share'
  });
  console.log('Calls:', p1.apiCalls);
  if (p1.apiCalls.length !== 1 || p1.apiCalls[0].category !== 'marketing') throw new Error('Test 1 Failed');
  console.log('✓ TEST 1 PASSED: 1 Course = Marketing Template + PDF #1\n');

  // --- SCENARIO 2: 2 Courses Selected ---
  console.log('--- TEST 2: 2 Courses Selected ---');
  const p2 = new MockProductionProvider();
  const e2 = new WhatsAppDispatchEngine(p2);
  const r2 = await e2.executeDispatch({
    recipientPhone: '+919823045678',
    studentName: 'Priya Sharma',
    courseTitle: 'C Programming, C++ Programming',
    textMessage: 'Hello',
    selectedMaterials: [pdf1, pdf2],
    context: 'swift_share'
  });
  console.log('Calls:', p2.apiCalls);
  if (p2.apiCalls.length !== 2 || p2.apiCalls[0].category !== 'marketing' || p2.apiCalls[1].category !== 'utility') throw new Error('Test 2 Failed');
  console.log('✓ TEST 2 PASSED: 2 Courses = Marketing Template + PDF #1, Utility Template + PDF #2\n');

  // --- SCENARIO 3: 3 Courses Selected ---
  console.log('--- TEST 3: 3 Courses Selected ---');
  const p3 = new MockProductionProvider();
  const e3 = new WhatsAppDispatchEngine(p3);
  const r3 = await e3.executeDispatch({
    recipientPhone: '+919823045678',
    studentName: 'Rohan Patil',
    courseTitle: 'C Programming, C++ Programming, Core Java',
    textMessage: 'Hello',
    selectedMaterials: [pdf1, pdf2, pdf3],
    context: 'swift_share'
  });
  console.log('Calls:', p3.apiCalls);
  if (p3.apiCalls.length !== 3 || p3.apiCalls[0].category !== 'marketing' || p3.apiCalls[1].category !== 'utility' || p3.apiCalls[2].category !== 'utility') throw new Error('Test 3 Failed');
  console.log('✓ TEST 3 PASSED: 3 Courses = Marketing Template + PDF #1, Utility Template + PDF #2, Utility Template + PDF #3\n');

  // --- SCENARIO 4: 4 Courses Selected ---
  console.log('--- TEST 4: 4 Courses Selected ---');
  const p4 = new MockProductionProvider();
  const e4 = new WhatsAppDispatchEngine(p4);
  const r4 = await e4.executeDispatch({
    recipientPhone: '+919823045678',
    studentName: 'Neha Gupta',
    courseTitle: 'C, C++, Java, Python',
    textMessage: 'Hello',
    selectedMaterials: [pdf1, pdf2, pdf3, pdf4],
    context: 'swift_share'
  });
  console.log('Calls:', p4.apiCalls);
  if (p4.apiCalls.length !== 4 || p4.apiCalls[0].category !== 'marketing' || p4.apiCalls.slice(1).some(c => c.category !== 'utility')) throw new Error('Test 4 Failed');
  console.log('✓ TEST 4 PASSED: 4 Courses = Marketing Template + PDF #1, 3 Utility Templates (PDF #2, #3, #4)\n');

  // Verify ZERO sendDocument calls in any scenario
  const allCalls = [...p1.apiCalls, ...p2.apiCalls, ...p3.apiCalls, ...p4.apiCalls];
  if (allCalls.some(c => c.action === 'sendDocument')) {
    throw new Error('FAILED: Found raw sendDocument call in Swift Share workflow!');
  }

  console.log('✅ ALL 4 SWIFT SHARE OUTBOUND DISPATCH TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

testSwiftShareOutboundScenarios().catch(err => {
  console.error('❌ Swift Share test failed:', err);
  process.exit(1);
});
