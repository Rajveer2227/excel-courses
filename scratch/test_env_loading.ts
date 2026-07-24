import { getWhatsAppConfig, validateWhatsAppConfig, getWhatsAppHealthStatus } from '../api/lib/whatsappConfig.js';

function testEnvLoading() {
  console.log('=== TESTING ENVIRONMENT VARIABLE LOADING & DIAGNOSTICS ===\n');

  const config = getWhatsAppConfig();
  const validation = validateWhatsAppConfig();
  const health = getWhatsAppHealthStatus();

  console.log('Current CWD:', health.cwd);
  console.log('Env File Loaded:', health.envFileLoaded);
  console.log('Graph API Version:', config.apiVersion);
  console.log('Target Endpoint:', config.graphApiBaseUrl);
  console.log('App Public URL:', config.appPublicUrl);
  console.log('\nHealth Payload:', JSON.stringify(health, null, 2));

  if (!health.cwd) {
    throw new Error('Health check payload missing CWD');
  }

  console.log('\n✅ ENVIRONMENT VARIABLE LOADING TEST COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

testEnvLoading();
