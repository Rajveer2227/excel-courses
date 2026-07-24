const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../public/assets/materials');
const destDir = path.join(__dirname, 'demo_samples');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

['sample-syllabus.pdf', 'sample-flyer.pdf'].forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved ${file} to scratch/demo_samples/`);
  }
});
