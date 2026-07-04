const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log(`Users count: ${userCount}`);
    
    const postCount = await prisma.post.count();
    console.log(`Posts count: ${postCount}`);
  } catch (e) {
    console.error('Error querying DB:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
