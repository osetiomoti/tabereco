import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const count = await p.post.count();
  console.log('Total posts in DB:', count);
  const posts = await p.post.findMany({
    select: { store_name: true, status: true, latitude: true, longitude: true },
    orderBy: { created_at: 'desc' },
    take: 12,
  });
  posts.forEach((post: any, i: number) => console.log(`  ${i+1}. ${post.store_name} | ${post.status} | lat: ${post.latitude}`));
}
main().catch(console.error).finally(() => p.$disconnect());
