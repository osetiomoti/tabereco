const { PrismaClient } = require('@prisma/client');

// Use the direct URL for migrations
const p = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_p0ngcy5uzTWI@ep-nameless-rice-aoyxinub.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&schema=public'
    }
  }
});

async function main() {
  try {
    // Check tables directly
    const tables = await p.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );
    console.log('Tables:', JSON.stringify(tables));
    
    // Try to add columns
    await p.$executeRawUnsafe(
      'ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS price_min INTEGER, ADD COLUMN IF NOT EXISTS price_max INTEGER'
    );
    console.log('OK - columns added');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
