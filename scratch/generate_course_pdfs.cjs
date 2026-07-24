const fs = require('fs');
const path = require('path');

function createPdfBuffer(title) {
  const contentText = `Excel Computers Kolhapur - ${title} 2026`;
  const streamContent = `BT\n/F1 16 Tf\n50 720 Td\n(${contentText}) Tj\nET`;
  const streamLength = Buffer.byteLength(streamContent);

  const pdfString = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
>>
endobj
4 0 obj
<<
  /Length ${streamLength}
>>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000307 00000 n 
trailer
<<
  /Size 5
  /Root 1 0 R
>>
startxref
415
%%EOF`;

  return Buffer.from(pdfString, 'utf-8');
}

const targetDir = path.join(__dirname, '../public/assets/materials');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const courses = [
  { file: 'c-programming.pdf', title: 'C Programming Syllabus' },
  { file: 'full-stack-python.pdf', title: 'Full Stack Python Overview' },
  { file: 'excel-computers-brochure-2026.pdf', title: 'General Admission Brochure 2026' },
  { file: 'data-analytics-powerbi.pdf', title: 'Data Analytics & Power BI Syllabus' },
  { file: 'cpp-programming.pdf', title: 'C++ Programming Fast-Track Syllabus' },
  { file: 'full-stack-web-development-mern.pdf', title: 'Full Stack Web Development MERN Syllabus' },
  { file: 'ai-machine-learning.pdf', title: 'AI & Machine Learning Internship Flyer' },
  { file: 'tally-prime-gst.pdf', title: 'Tally Prime + GST Fee Structure & Brochure' }
];

courses.forEach(c => {
  const filePath = path.join(targetDir, c.file);
  const pdfBuf = createPdfBuffer(c.title);
  fs.writeFileSync(filePath, pdfBuf);
  console.log(`Generated: ${c.file} (${pdfBuf.length} bytes)`);
});
