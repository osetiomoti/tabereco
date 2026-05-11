const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const [users, posts, tags, ptags] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.tag.count(),
    prisma.postTag.count(),
  ]);
  console.log('Neon DB check:');
  console.log('  Users:', users);
  console.log('  Posts:', posts);
  console.log('  Tags:', tags);
  console.log('  PostTags:', ptags);
}
check().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
