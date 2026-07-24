import { generateQuickShareMessage } from '../src/utils/messageTemplates.js';

function testUpdatedTemplate() {
  console.log('=== TESTING UPDATED DEFAULT WHATSAPP MESSAGE TEMPLATE ===\n');

  // Test 1: Full options
  const msg1 = generateQuickShareMessage({
    studentName: 'Rahul',
    courseName: 'Advanced Java',
    materials: ['Advanced Java Brochure', 'Fee Structure']
  });

  console.log('--- Output Message ---');
  console.log(msg1);
  console.log(`\nCharacter Count: ${msg1.length}`);

  const expectedTemplate = `Hello Rahul,

Thank you for contacting Excel Computers.

We've shared the requested information for our Advanced Java course.

If you have any questions regarding the course, fees, batch timings, or admissions, please feel free to contact us. Our team will be happy to assist you.

Regards,
Excel Computers
Kolhapur`;

  if (msg1 !== expectedTemplate) {
    console.error('Mismatch detected!');
    console.error('Got:\n' + msg1);
    console.error('Expected:\n' + expectedTemplate);
    throw new Error('Template output does not match required format');
  }

  // Verify NO references to attachments/materials
  if (msg1.includes('Attached') || msg1.includes('•') || msg1.includes('materials') || msg1.includes('Brochure')) {
    throw new Error('Message must not contain references to attached materials/files');
  }

  console.log('\n✅ UPDATED WHATSAPP MESSAGE TEMPLATE VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

testUpdatedTemplate();
