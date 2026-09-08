import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

const CF_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || 'd1vw7ugwoz2pss.cloudfront.net';
const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;

function toS3Key(keyOrUrl) {
  if (!keyOrUrl) return null;
  const trimmed = keyOrUrl.trim();
  if (!trimmed) return null;

  // Already an S3 key (doesn't start with protocol or root slash)
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  // CloudFront URL
  if (CF_DOMAIN && trimmed.includes(CF_DOMAIN)) {
    const parts = trimmed.split(`${CF_DOMAIN}/`);
    return parts.length > 1 ? parts[1] : trimmed;
  }

  // Raw S3 URL
  if (S3_BUCKET && trimmed.includes(`${S3_BUCKET}.s3`)) {
    const regex = new RegExp(`https?://${S3_BUCKET}\\.s3[.-][^/]+/`);
    return trimmed.replace(regex, '');
  }

  // Generic cloudfront domain regex fallback
  const cfRegex = /https?:\/\/[a-z0-9]+\.cloudfront\.net\//;
  if (cfRegex.test(trimmed)) {
    return trimmed.replace(cfRegex, '');
  }

  return trimmed;
}

async function main() {
  console.log(`\n==============================================`);
  console.log(`Image URL -> S3 Key Migration`);
  console.log(`Mode: ${isExecute ? '🚀 EXECUTE' : '🔍 DRY RUN (Preview only)'}`);
  console.log(`CloudFront Domain: ${CF_DOMAIN}`);
  console.log(`==============================================\n`);

  // 1. Post records
  const posts = await prisma.post.findMany({
    select: { id: true, title: true, image_url: true, image_urls: true },
  });

  const postsToUpdate = [];
  for (const p of posts) {
    let changed = false;
    let newImageUrl = p.image_url;
    let newImageUrls = p.image_urls;

    if (p.image_url) {
      const converted = toS3Key(p.image_url);
      if (converted !== p.image_url) {
        newImageUrl = converted;
        changed = true;
      }
    }

    if (p.image_urls && Array.isArray(p.image_urls)) {
      const convertedList = p.image_urls.map(u => toS3Key(u)).filter(Boolean);
      if (JSON.stringify(convertedList) !== JSON.stringify(p.image_urls)) {
        newImageUrls = convertedList;
        changed = true;
      }
    }

    if (changed) {
      postsToUpdate.push({
        id: p.id,
        title: p.title,
        oldImageUrl: p.image_url,
        newImageUrl,
        oldImageUrls: p.image_urls,
        newImageUrls,
      });
    }
  }

  // 2. User records
  const users = await prisma.user.findMany({
    select: { id: true, name: true, avatar_url: true },
  });

  const usersToUpdate = [];
  for (const u of users) {
    if (u.avatar_url) {
      const converted = toS3Key(u.avatar_url);
      if (converted !== u.avatar_url) {
        usersToUpdate.push({
          id: u.id,
          name: u.name,
          oldAvatarUrl: u.avatar_url,
          newAvatarUrl: converted,
        });
      }
    }
  }

  // 3. Group records
  const groups = await prisma.group.findMany({
    select: { id: true, name: true, image_url: true },
  });

  const groupsToUpdate = [];
  for (const g of groups) {
    if (g.image_url) {
      const converted = toS3Key(g.image_url);
      if (converted !== g.image_url) {
        groupsToUpdate.push({
          id: g.id,
          name: g.name,
          oldImageUrl: g.image_url,
          newImageUrl: converted,
        });
      }
    }
  }

  console.log(`📊 Summary of targets:`);
  console.log(`- Posts to update: ${postsToUpdate.length} / ${posts.length}`);
  console.log(`- Users to update: ${usersToUpdate.length} / ${users.length}`);
  console.log(`- Groups to update: ${groupsToUpdate.length} / ${groups.length}\n`);

  if (postsToUpdate.length > 0) {
    console.log(`📝 Post samples (first 3):`);
    for (const p of postsToUpdate.slice(0, 3)) {
      console.log(`  [Post ${p.id}] "${p.title}"`);
      if (p.oldImageUrl !== p.newImageUrl) {
        console.log(`    image_url:`);
        console.log(`      BEFORE: ${p.oldImageUrl}`);
        console.log(`      AFTER:  ${p.newImageUrl}`);
      }
      if (p.oldImageUrls && p.oldImageUrls.length > 0) {
        console.log(`    image_urls count: ${p.newImageUrls?.length}`);
      }
    }
    console.log('');
  }

  if (usersToUpdate.length > 0) {
    console.log(`📝 User samples (first 3):`);
    for (const u of usersToUpdate.slice(0, 3)) {
      console.log(`  [User ${u.id}] "${u.name}"`);
      console.log(`    avatar_url:`);
      console.log(`      BEFORE: ${u.oldAvatarUrl}`);
      console.log(`      AFTER:  ${u.newAvatarUrl}`);
    }
    console.log('');
  }

  if (groupsToUpdate.length > 0) {
    console.log(`📝 Group samples:`);
    for (const g of groupsToUpdate) {
      console.log(`  [Group ${g.id}] "${g.name}"`);
      console.log(`    image_url:`);
      console.log(`      BEFORE: ${g.oldImageUrl}`);
      console.log(`      AFTER:  ${g.newImageUrl}`);
    }
    console.log('');
  }

  if (isDryRun) {
    console.log(`ℹ️ Dry run completed. No data was modified.`);
    console.log(`To apply these changes, run with: node scripts/migrate-image-urls-to-keys.mjs --execute\n`);
    return;
  }

  // Execution
  console.log(`🚀 Applying updates to Neon Database...`);

  let updatedPosts = 0;
  for (const p of postsToUpdate) {
    await prisma.post.update({
      where: { id: p.id },
      data: {
        image_url: p.newImageUrl,
        image_urls: p.newImageUrls,
      },
    });
    updatedPosts++;
    if (updatedPosts % 10 === 0 || updatedPosts === postsToUpdate.length) {
      process.stdout.write(`  Updated posts: ${updatedPosts}/${postsToUpdate.length}\r`);
    }
  }
  console.log(`\n  ✅ Successfully updated ${updatedPosts} posts.`);

  let updatedUsers = 0;
  for (const u of usersToUpdate) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        avatar_url: u.newAvatarUrl,
      },
    });
    updatedUsers++;
  }
  console.log(`  ✅ Successfully updated ${updatedUsers} users.`);

  let updatedGroups = 0;
  for (const g of groupsToUpdate) {
    await prisma.group.update({
      where: { id: g.id },
      data: {
        image_url: g.newImageUrl,
      },
    });
    updatedGroups++;
  }
  console.log(`  ✅ Successfully updated ${updatedGroups} groups.`);

  console.log(`\n🎉 Migration successfully completed!\n`);
}

main()
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
