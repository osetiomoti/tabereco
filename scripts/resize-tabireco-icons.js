// tabireco.png を各サイズにリサイズするスクリプト
// 使い方: node scripts/resize-tabireco-icons.js
const sharp = require('sharp');
const path = require('path');

const INPUT = path.join(__dirname, '../public/tabireco.png');

const targets = [
  { output: path.join(__dirname, '../public/tabireco-192.png'), size: 192 },
  { output: path.join(__dirname, '../public/tabireco-512.png'), size: 512 },
];

async function resize() {
  console.log('=== Resizing tabireco.png ===');
  for (const { output, size } of targets) {
    await sharp(INPUT)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(output);
    console.log(`✅ ${size}x${size} -> ${path.basename(output)}`);
  }
  console.log('Done!');
}

resize().catch(e => { console.error(e); process.exit(1); });
