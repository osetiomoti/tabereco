const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.post.updateMany({
    where: {
      app_type: 'tabereco',
      spring_temp_type: { not: null }
    },
    data: {
      spring_temp_type: null
    }
  });
  console.log('Updated posts:', result.count);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
