require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function main() {
  const posts = await prisma.post.findMany({
    select: {
      image_url: true,
      image_urls: true,
    }
  });

  const urls = [];
  for (const p of posts) {
    if (p.image_url && p.image_url.includes('cloudfront.net')) urls.push(p.image_url);
    if (p.image_urls) {
      for (const u of p.image_urls) {
        if (u && u.includes('cloudfront.net') && !urls.includes(u)) urls.push(u);
      }
    }
  }

  console.log(`Checking ${Math.min(urls.length, 30)} random images out of ${urls.length}...`);

  // Shuffle and pick 30
  const sample = urls.sort(() => 0.5 - Math.random()).slice(0, 30);

  const sizes = [];
  for (const url of sample) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const len = res.headers.get('content-length');
      if (len) {
        const bytes = parseInt(len, 10);
        sizes.push({ url, bytes, kb: Math.round(bytes / 1024), mb: (bytes / 1024 / 1024).toFixed(2) });
      }
    } catch (e) {
      console.error('Error fetching', url, e.message);
    }
  }

  sizes.sort((a, b) => b.bytes - a.bytes);

  console.log('\n--- Sample Image Sizes ---');
  for (const s of sizes.slice(0, 15)) {
    console.log(`${s.mb} MB (${s.kb} KB) - ${s.url.split('/').pop()}`);
  }

  const avgBytes = sizes.reduce((a, b) => a + b.bytes, 0) / sizes.length;
  console.log(`\nAverage Size: ${(avgBytes / 1024 / 1024).toFixed(2)} MB (${Math.round(avgBytes / 1024)} KB)`);
  console.log(`Estimated Total for ${urls.length} images: ${((avgBytes * urls.length) / 1024 / 1024 / 1024).toFixed(2)} GB`);
}

main().finally(() => prisma.$disconnect());
