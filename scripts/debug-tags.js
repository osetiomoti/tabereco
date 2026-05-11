/**
 * Fix orphaned posts: link existing posts to tags based on their associated tags in the DB,
 * or manually fix the known issue where posts don't have their post_tags entries.
 * 
 * This script looks at all posts and all tags for each user,
 * and reports which posts have no tags attached.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const postsWithoutTags = await prisma.post.findMany({
    where: {
      tags: { none: {} }
    },
    select: {
      id: true,
      title: true,
      store_name: true,
      user_id: true,
    },
    orderBy: { created_at: 'desc' }
  });

  console.log(`\n=== Posts WITHOUT any tags: ${postsWithoutTags.length} ===`);
  postsWithoutTags.forEach(p => {
    console.log(`  [${p.user_id}] "${p.title}" (${p.store_name || 'no store'})`);
  });

  // Get all tags
  const allTags = await prisma.tag.findMany();
  console.log(`\n=== All tags: ${allTags.length} ===`);
  allTags.forEach(t => console.log(`  [${t.user_id}] "${t.name}" id=${t.id}`));
  
  // Get all post_tags
  const ptCount = await prisma.postTag.count();
  console.log(`\n=== Total PostTags: ${ptCount} ===`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); process.exit(1); });
