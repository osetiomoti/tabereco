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
      id: true,
      user_id: true,
      image_url: true,
      image_urls: true,
    }
  });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      avatar_url: true,
    }
  });

  const postImageUrls = new Set();
  let totalPostImages = 0;

  for (const p of posts) {
    if (p.image_url) {
      postImageUrls.add(p.image_url);
      totalPostImages++;
    }
    if (p.image_urls && Array.isArray(p.image_urls)) {
      for (const url of p.image_urls) {
        if (url) {
          postImageUrls.add(url);
          totalPostImages++;
        }
      }
    }
  }

  const avatarUrls = new Set();
  for (const u of users) {
    if (u.avatar_url) {
      avatarUrls.add(u.avatar_url);
    }
  }

  console.log('--- DB Image Summary ---');
  console.log('Total Posts:', posts.length);
  console.log('Total Users:', users.length);
  console.log('Total Post Images (including duplicates):', totalPostImages);
  console.log('Unique Post Image URLs:', postImageUrls.size);
  console.log('Unique Avatar URLs:', avatarUrls.size);

  const sampleUrls = Array.from(postImageUrls).slice(0, 10);
  console.log('\nSample Post Image URLs:');
  sampleUrls.forEach(url => console.log(' -', url));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
