const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    // Check current schema and search_path
    const result = await p.$queryRawUnsafe('SELECT current_schema(), current_database()');
    console.log('Current schema:', JSON.stringify(result));
    
    const schemas = await p.$queryRawUnsafe(
      "SELECT schema_name FROM information_schema.schemata"
    );
    console.log('All schemas:', JSON.stringify(schemas));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
