import { WhatsAppDispatchEngine, type IWhatsAppProvider, type SendTextOptions, type SendTemplateOptions, type SendMediaOptions, type WhatsAppProviderResponse } from '../src/services/whatsappDispatchEngine.js';
import type { MediaItem } from '../src/data/shareData.js';

class MockMetaAuditProvider implements IWhatsAppProvider {
  public providerName = 'Mock Meta Audit Provider';
  public logs: string[] = [];

  public async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppProviderResponse> {
    const logMsg = `Sending Utility Template: templateCategory=${options.templateCategory}, header=${options.headerMediaFilename}, course=${options.courseTitle}`;
    this.logs.push(logMsg);
    console.log(`[MockProvider] ${logMsg}`);
    return { success: true, messageId: `mock-tmpl-util-${Date.now()}` };
  }

  public async sendText(options: SendTextOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-txt-${Date.now()}` };
  }

  public async sendDocument(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    const logMsg = `Attempting Raw Document for "${options.filename}"`;
    this.logs.push(logMsg);
    console.log(`[MockProvider] ${logMsg}`);

    // Simulate Meta Customer Window Closed Error (#131047) for raw document #2 & #3
    return {
      success: false,
      error: '(#131047) Re-engagement message - customer care window is not active.',
      code: 'META_ERROR_131047',
      statusCode: 400,
      details: {
        error: {
          message: '(#131047) Re-engagement message',
          type: 'OAuthException',
          code: 131047,
          error_data: {
            messaging_product: 'whatsapp',
            details: 'Re-engagement message - customer care window is not active.'
          }
        }
      }
    };
  }

  public async sendImage(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-img-${Date.now()}` };
  }

  public async sendVideo(options: SendMediaOptions): Promise<WhatsAppProviderResponse> {
    return { success: true, messageId: `mock-vid-${Date.now()}` };
  }
}

async function testUtilityFallbackAudit() {
  console.log('=== VERIFYING UTILITY FALLBACK EXECUTION & AUDIT LOGGING ===\n');

  const materials: MediaItem[] = [
    { id: 'pdf-1', title: 'C Programming.pdf', previewUrl: 'https://blob/c.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-2', title: 'C++ Programming.pdf', previewUrl: 'https://blob/cpp.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false },
    { id: 'pdf-3', title: 'Core Java.pdf', previewUrl: 'https://blob/java.pdf', fileType: 'pdf', category: 'Syllabus', fileSize: '1 MB', courseIds: ['ALL'], uploadDate: '2026-07-29', isFavorite: false }
  ];

  const provider = new MockMetaAuditProvider();
  const engine = new WhatsAppDispatchEngine(provider);

  const result = await engine.executeDispatch({
    recipientPhone: '9823045678',
    studentName: 'Test Student',
    courseTitle: 'C Programming, C++ Programming, Core Java',
    textMessage: 'Hello',
    selectedMaterials: materials,
    context: 'swift_share'
  });

  console.log('\n--- VERIFICATION STATS ---');
  console.log('Overall Success:', result.success);
  console.log('Delivered Total:', result.deliveredMediaCount);
  console.log('Delivered via Marketing:', result.deliveredViaMarketingCount);
  console.log('Delivered via Document:', result.deliveredViaDocumentCount);
  console.log('Delivered via Utility Fallback:', result.deliveredViaUtilityCount);

  if (!result.success) throw new Error('Expected overall dispatch to succeed via Utility fallback!');
  if (result.deliveredViaMarketingCount !== 1) throw new Error('PDF 1 must be delivered via Marketing Template!');
  if (result.deliveredViaUtilityCount !== 2) throw new Error('PDF 2 and PDF 3 MUST be delivered via Utility Template fallback!');

  console.log('\n✅ ALL UTILITY FALLBACK AUDIT CHECKS PASSED PERFECTLY!\n');
  process.exit(0);
}

testUtilityFallbackAudit().catch(err => {
  console.error('❌ Audit test failed:', err);
  process.exit(1);
});
