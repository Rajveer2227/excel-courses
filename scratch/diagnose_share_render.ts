async function diagnoseShareImport() {
  console.log('Testing import of Share.tsx...');
  try {
    const shareModule = await import('../src/pages/Share.js');
    console.log('Successfully imported Share.tsx! Default export type:', typeof shareModule.default);
  } catch (err: any) {
    console.error('❌ Failed to import Share.tsx:', err);
  }
}

diagnoseShareImport();
