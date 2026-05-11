/**
 * Fix: attach tags to posts that have none.
 * Based on post titles/store names, link the correct tags.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userId = '04be2f26-45d5-4964-956e-7623f833f0d4';

// Map: post title keywords -> tag names to create/attach
const TAG_MAP = [
  { keyword: 'ラーメン', tagName: 'ラーメン' },
  { keyword: '焼肉', tagName: '焼肉' },
  { keyword: 'スープカレー', tagName: 'カレー' },
  { keyword: 'たこ焼き', tagName: 'たこ焼き' },
  { keyword: 'ピザ', tagName: 'ピザ' },
  { keyword: '焼き鳥', tagName: '焼き鳥' },
  { keyword: '天ぷら', tagName: '天ぷら' },
  { keyword: '鮨', tagName: '寿司' },
];

async function main() {
  const posts = await prisma.post.findMany({
    where: { user_id: userId, tags: { none: {} } },
    include: { tags: true }
  });

  console.log(`Fixing ${posts.length} posts...`);

  for (const post of posts) {
    const fullText = `${post.title} ${post.store_name || ''}`;
    
    for (const { keyword, tagName } of TAG_MAP) {
      if (fullText.includes(keyword)) {
        // Upsert the tag
        let tag = await prisma.tag.findUnique({
          where: { user_id_name: { user_id: userId, name: tagName } }
        });
        
        if (!tag) {
          const lastTag = await prisma.tag.findFirst({
            where: { user_id: userId },
            orderBy: { sort_order: 'desc' }
          });
          tag = await prisma.tag.create({
            data: {
              user_id: userId,
              name: tagName,
              sort_order: (lastTag?.sort_order ?? -1) + 1,
            }
          });
          console.log(`  Created tag: #${tagName}`);
        }

        // Link post to tag
        await prisma.postTag.upsert({
          where: { post_id_tag_id: { post_id: post.id, tag_id: tag.id } },
          create: { post_id: post.id, tag_id: tag.id },
          update: {}
        });

        console.log(`  Linked "${post.title}" -> #${tagName}`);
        break; // one tag per post is enough for now
      }
    }
  }

  // Final count
  const ptCount = await prisma.postTag.count();
  console.log(`\nDone. Total PostTags: ${ptCount}`);
  
  const tags = await prisma.tag.findMany({ where: { user_id: userId } });
  console.log('Tags:', tags.map(t => t.name));
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); process.exit(1); });
