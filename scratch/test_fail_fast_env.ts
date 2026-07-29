import handler from '../api/whatsapp/send.js';

async function testServerFailFastEnvironmentValidation() {
  console.log('=== VERIFYING SERVER API GATEWAY FAIL-FAST ENVIRONMENT VALIDATION ===\n');

  const savedMkt = process.env.WHATSAPP_MARKETING_TEMPLATE;
  const savedUtl = process.env.WHATSAPP_UTILITY_TEMPLATE;

  // TEST 1: Missing WHATSAPP_MARKETING_TEMPLATE returns HTTP 500 JSON error
  delete process.env.WHATSAPP_MARKETING_TEMPLATE;
  process.env.WHATSAPP_UTILITY_TEMPLATE = 'course_information';

  let mktResponseData: any = null;
  const mockReq1: any = {
    method: 'POST',
    body: {
      action: 'sendTemplate',
      toE164: '+919823045678',
      studentName: 'Test',
      courseTitle: 'C',
      headerMediaUrl: 'https://example.com/test.pdf',
      templateCategory: 'marketing'
    }
  };
  const mockRes1: any = {
    status: (code: number) => ({
      json: (data: any) => {
        mktResponseData = { statusCode: code, data };
        return mockRes1;
      }
    })
  };

  await handler(mockReq1, mockRes1);

  if (mktResponseData?.statusCode === 500 && mktResponseData?.data?.error?.includes('WHATSAPP_MARKETING_TEMPLATE')) {
    console.log(`✓ Caught expected server error when WHATSAPP_MARKETING_TEMPLATE is missing: "${mktResponseData.data.error}"`);
  } else {
    throw new Error(`Expected HTTP 500 for missing WHATSAPP_MARKETING_TEMPLATE, got: ${JSON.stringify(mktResponseData)}`);
  }

  // TEST 2: Missing WHATSAPP_UTILITY_TEMPLATE returns HTTP 500 JSON error
  process.env.WHATSAPP_MARKETING_TEMPLATE = 'course_information_v2';
  delete process.env.WHATSAPP_UTILITY_TEMPLATE;

  let utlResponseData: any = null;
  const mockReq2: any = {
    method: 'POST',
    body: {
      action: 'sendTemplate',
      toE164: '+919823045678',
      studentName: 'Test',
      courseTitle: 'C',
      headerMediaUrl: 'https://example.com/test.pdf',
      templateCategory: 'utility'
    }
  };
  const mockRes2: any = {
    status: (code: number) => ({
      json: (data: any) => {
        utlResponseData = { statusCode: code, data };
        return mockRes2;
      }
    })
  };

  await handler(mockReq2, mockRes2);

  if (utlResponseData?.statusCode === 500 && utlResponseData?.data?.error?.includes('WHATSAPP_UTILITY_TEMPLATE')) {
    console.log(`✓ Caught expected server error when WHATSAPP_UTILITY_TEMPLATE is missing: "${utlResponseData.data.error}"`);
  } else {
    throw new Error(`Expected HTTP 500 for missing WHATSAPP_UTILITY_TEMPLATE, got: ${JSON.stringify(utlResponseData)}`);
  }

  // Restore env
  process.env.WHATSAPP_MARKETING_TEMPLATE = savedMkt || 'course_information_v2';
  process.env.WHATSAPP_UTILITY_TEMPLATE = savedUtl || 'course_information';

  console.log('\n✅ SERVER API GATEWAY FAIL-FAST ENVIRONMENT VALIDATION PASSED SUCCESSFULLY!\n');
}

testServerFailFastEnvironmentValidation().catch(err => {
  console.error('❌ Server fail-fast test failed:', err);
  process.exit(1);
});
