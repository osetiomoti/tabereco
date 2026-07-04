const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, cognito_sub: true, name: true, created_at: true }
  });
  console.log("Users in DB:", users);

  const posts = await prisma.post.count();
  console.log("Total Posts in DB:", posts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
