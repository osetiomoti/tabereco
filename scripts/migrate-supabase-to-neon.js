/**
 * データ移行スクリプト: Supabase → Neon
 * Supabaseから全データを取得し、Neonに挿入する
 */
const { PrismaClient } = require('@prisma/client');

const SUPABASE_URL = 'postgresql://postgres:J3M6Wkc4konYOkm8@db.cyvqyaxxcxskxffqipkw.supabase.co:5432/postgres?schema=public';
const NEON_URL = 'postgresql://neondb_owner:npg_p0ngcy5uzTWI@ep-nameless-rice-aoyxinub.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const src = new PrismaClient({ datasources: { db: { url: SUPABASE_URL } } });
const dst = new PrismaClient({ datasources: { db: { url: NEON_URL } } });

async function migrate() {
  console.log('Starting migration: Supabase → Neon\n');

  // ─── 1. Users ───────────────────────────────────────────────
  const users = await src.user.findMany();
  console.log(`Users: ${users.length}`);
  for (const u of users) {
    await dst.user.upsert({
      where: { id: u.id },
      create: u,
      update: u,
    });
  }
  console.log('  ✓ Users migrated');

  // ─── 2. Groups ──────────────────────────────────────────────
  const groups = await src.group.findMany();
  console.log(`Groups: ${groups.length}`);
  for (const g of groups) {
    await dst.group.upsert({
      where: { id: g.id },
      create: g,
      update: g,
    });
  }
  console.log('  ✓ Groups migrated');

  // ─── 3. GroupMembers ────────────────────────────────────────
  const members = await src.groupMember.findMany();
  console.log(`GroupMembers: ${members.length}`);
  for (const m of members) {
    await dst.groupMember.upsert({
      where: { group_id_user_id: { group_id: m.group_id, user_id: m.user_id } },
      create: m,
      update: m,
    });
  }
  console.log('  ✓ GroupMembers migrated');

  // ─── 4. Posts ───────────────────────────────────────────────
  const posts = await src.post.findMany();
  console.log(`Posts: ${posts.length}`);
  for (const p of posts) {
    await dst.post.upsert({
      where: { id: p.id },
      create: p,
      update: p,
    });
  }
  console.log('  ✓ Posts migrated');

  // ─── 5. Tags ────────────────────────────────────────────────
  const tags = await src.tag.findMany();
  console.log(`Tags: ${tags.length}`);
  for (const t of tags) {
    await dst.tag.upsert({
      where: { user_id_name: { user_id: t.user_id, name: t.name } },
      create: t,
      update: t,
    });
  }
  console.log('  ✓ Tags migrated');

  // ─── 6. PostTags ────────────────────────────────────────────
  const postTags = await src.postTag.findMany();
  console.log(`PostTags: ${postTags.length}`);
  for (const pt of postTags) {
    await dst.postTag.upsert({
      where: { post_id_tag_id: { post_id: pt.post_id, tag_id: pt.tag_id } },
      create: pt,
      update: pt,
    });
  }
  console.log('  ✓ PostTags migrated');

  // ─── 7. PostGroups ──────────────────────────────────────────
  const postGroups = await src.postGroup.findMany();
  console.log(`PostGroups: ${postGroups.length}`);
  for (const pg of postGroups) {
    await dst.postGroup.upsert({
      where: { post_id_group_id: { post_id: pg.post_id, group_id: pg.group_id } },
      create: pg,
      update: pg,
    });
  }
  console.log('  ✓ PostGroups migrated');

  // ─── 8. Friendships ─────────────────────────────────────────
  const friendships = await src.friendship.findMany();
  console.log(`Friendships: ${friendships.length}`);
  for (const f of friendships) {
    await dst.friendship.upsert({
      where: { id: f.id },
      create: f,
      update: f,
    });
  }
  console.log('  ✓ Friendships migrated');

  // ─── 9. TagRankings ─────────────────────────────────────────
  const rankings = await src.tagRanking.findMany();
  console.log(`TagRankings: ${rankings.length}`);
  for (const r of rankings) {
    await dst.tagRanking.upsert({
      where: { user_id_tag_name_post_id: { user_id: r.user_id, tag_name: r.tag_name, post_id: r.post_id } },
      create: r,
      update: r,
    });
  }
  console.log('  ✓ TagRankings migrated');

  console.log('\n✅ Migration complete!');
}

migrate()
  .then(() => Promise.all([src.$disconnect(), dst.$disconnect()]))
  .catch(e => {
    console.error('\n❌ Migration failed:', e.message);
    Promise.all([src.$disconnect(), dst.$disconnect()]);
    process.exit(1);
  });
