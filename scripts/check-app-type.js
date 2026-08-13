// app_type カラム追加後のデータ確認スクリプト
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const [tabereco, tabireco, total] = await Promise.all([
    prisma.post.count({ where: { app_type: 'tabereco' } }),
    prisma.post.count({ where: { app_type: 'tabireco' } }),
    prisma.post.count(),
  ]);
  console.log('=== app_type Migration Check ===');
  console.log('  tabereco posts:', tabereco);
  console.log('  tabireco posts:', tabireco);
  console.log('  total posts:   ', total);
  if (tabereco + tabireco === total) {
    console.log('✅ All posts have app_type set correctly');
  } else {
    console.log('⚠️  Some posts are missing app_type');
  }
}

check().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
