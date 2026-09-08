import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({ select: { id: true, image_url: true, image_urls: true } });
  const domains = new Set();
  let nonCfPosts = 0;
  for (const p of posts) {
    if (p.image_url) {
      try {
        const origin = new URL(p.image_url).origin;
        domains.add(origin);
        if (!origin.includes('cloudfront.net')) nonCfPosts++;
      } catch {
        domains.add('INVALID: ' + p.image_url);
      }
    }
    for (const u of p.image_urls || []) {
      try {
        const origin = new URL(u).origin;
        domains.add(origin);
        if (!origin.includes('cloudfront.net')) nonCfPosts++;
      } catch {
        domains.add('INVALID: ' + u);
      }
    }
  }
  console.log('Post Image Domains:', Array.from(domains));
  console.log('Non-CF post image count:', nonCfPosts);

  const users = await prisma.user.findMany({ select: { avatar_url: true } });
  const userDomains = new Set();
  for (const u of users) {
    if (u.avatar_url) {
      try {
        userDomains.add(new URL(u.avatar_url).origin);
      } catch {
        userDomains.add('INVALID: ' + u.avatar_url);
      }
    }
  }
  console.log('User Avatar Domains:', Array.from(userDomains));

  const groups = await prisma.group.findMany({ select: { image_url: true } });
  const groupDomains = new Set();
  for (const g of groups) {
    if (g.image_url) {
      try {
        groupDomains.add(new URL(g.image_url).origin);
      } catch {
        groupDomains.add('INVALID: ' + g.image_url);
      }
    }
  }
  console.log('Group Image Domains:', Array.from(groupDomains));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
