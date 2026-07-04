const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding price_min and price_max columns...');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE posts ADD COLUMN IF NOT EXISTS price_min INTEGER;'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE posts ADD COLUMN IF NOT EXISTS price_max INTEGER;'
    );
    console.log('Columns added successfully.');
    
    // Verify columns exist
    const cols = await prisma.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'posts'"
    );
    const hasMin = cols.some(c => c.column_name === 'price_min');
    const hasMax = cols.some(c => c.column_name === 'price_max');
    console.log(`Verified columns - price_min: ${hasMin}, price_max: ${hasMax}`);
  } catch (e) {
    console.error('Error adding columns:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
