#!/usr/bin/env node
/**
 * cleanup-orphaned-s3.mjs
 *
 * S3 に存在するが DB から参照されていない「ゴミデータ」を特定・削除します。
 *
 * 安全設計:
 *   - --dry-run で削除せずに一覧表示のみ（デフォルト）
 *   - --delete を明示指定した場合のみ削除
 *   - webp と jpg で同名の場合（古いjpgの残り等）も考慮
 *   - DB から全参照 URL を収集してから比較
 *
 * 使い方:
 *   node scripts/cleanup-orphaned-s3.mjs            # ドライラン（確認のみ）
 *   node scripts/cleanup-orphaned-s3.mjs --delete   # 実際に削除
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DELETE_MODE = process.argv.includes('--delete');
const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? '';
const REGION = process.env.AWS_REGION ?? process.env.COGNITO_REGION ?? 'ap-northeast-1';
const CF_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN ?? '';

if (!BUCKET) {
  console.error('❌ AWS_S3_BUCKET_NAME not set');
  process.exit(1);
}

const prisma = new PrismaClient();

// ── S3 全オブジェクトを列挙 ───────────────────────────────
async function listAllS3Keys() {
  const keys = [];
  let continuationToken = null;

  while (true) {
    let url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/?list-type=2&max-keys=1000`;
    if (continuationToken) {
      url += `&continuation-token=${encodeURIComponent(continuationToken)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S3 List failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const xml = await res.text();

    // Key を抽出
    const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
    for (const match of keyMatches) {
      keys.push(match[1]);
    }

    // ページネーション
    const truncatedMatch = xml.match(/<IsTruncated>([^<]+)<\/IsTruncated>/);
    const isTruncated = truncatedMatch?.[1] === 'true';
    if (!isTruncated) break;

    const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    if (!tokenMatch) break;
    continuationToken = tokenMatch[1];

    process.stdout.write(`  Listed ${keys.length} keys...\r`);
  }

  console.log(`  Listed ${keys.length} total keys in S3.`);
  return keys;
}

// ── DB から全参照 S3 キーを収集 ──────────────────────────
function urlToKey(url) {
  if (!url) return null;
  // If already an S3 key without http/https schema
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url.split('?')[0];
  }
  if (CF_DOMAIN && url.includes(CF_DOMAIN)) {
    return url.replace(`https://${CF_DOMAIN}/`, '').split('?')[0];
  }
  const s3Base = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`;
  if (url.startsWith(s3Base)) {
    return url.replace(s3Base, '').split('?')[0];
  }
  return null;
}

async function getAllReferencedKeys() {
  const [posts, users, groups] = await Promise.all([
    prisma.post.findMany({ select: { image_url: true, image_urls: true } }),
    prisma.user.findMany({ select: { avatar_url: true } }),
    prisma.group.findMany({ select: { image_url: true } }),
  ]);

  const keys = new Set();

  for (const p of posts) {
    const k = urlToKey(p.image_url);
    if (k) keys.add(k);
    if (p.image_urls) p.image_urls.forEach(u => { const k2 = urlToKey(u); if (k2) keys.add(k2); });
  }
  for (const u of users) {
    const k = urlToKey(u.avatar_url);
    if (k) keys.add(k);
  }
  for (const g of groups) {
    const k = urlToKey(g.image_url);
    if (k) keys.add(k);
  }

  return keys;
}

// ── メイン ──────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 S3 Orphan Cleanup ${DELETE_MODE ? '[DELETE MODE]' : '[DRY RUN]'}`);
  console.log(`   Bucket: ${BUCKET} (${REGION})\n`);

  console.log('📖 Loading all S3 keys...');
  const s3Keys = await listAllS3Keys();
  console.log(`   Total S3 objects: ${s3Keys.length}\n`);

  console.log('📖 Loading all DB-referenced keys...');
  const dbKeys = await getAllReferencedKeys();
  console.log(`   Total DB-referenced keys: ${dbKeys.size}\n`);

  // ゴミデータ特定
  const orphans = s3Keys.filter(key => !dbKeys.has(key));

  console.log(`\n📊 Results:`);
  console.log(`   S3 total:       ${s3Keys.length}`);
  console.log(`   DB referenced:  ${dbKeys.size}`);
  console.log(`   Orphans found:  ${orphans.length}\n`);

  if (orphans.length === 0) {
    console.log('✅ No orphaned files found! S3 is clean.');
    await prisma.$disconnect();
    return;
  }

  // サイズを取得して集計
  let totalOrphanSize = 0;
  const orphanDetails = [];

  console.log('📦 Analyzing orphan sizes...');
  for (const key of orphans) {
    const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    const headRes = await fetch(s3Url, { method: 'HEAD' });
    const size = parseInt(headRes.headers.get('content-length') ?? '0', 10);
    totalOrphanSize += size;
    orphanDetails.push({ key, size });
  }

  // サイズ降順でソート
  orphanDetails.sort((a, b) => b.size - a.size);

  console.log('\n🗑️  Orphaned files (sorted by size):');
  console.log('─────────────────────────────────────────────────────');
  for (const { key, size } of orphanDetails) {
    const sizeStr = size > 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} MB`
      : `${(size / 1024).toFixed(0)} KB`;
    console.log(`  ${DELETE_MODE ? '🗑️' : '[ ]'} ${key} (${sizeStr})`);
  }
  console.log('─────────────────────────────────────────────────────');
  console.log(`  Total orphan size: ${(totalOrphanSize / 1024 / 1024).toFixed(1)} MB (${orphans.length} files)\n`);

  if (!DELETE_MODE) {
    console.log('ℹ️  This was a dry run. To delete, run:');
    console.log('   node scripts/cleanup-orphaned-s3.mjs --delete\n');
    await prisma.$disconnect();
    return;
  }

  // 削除実行
  console.log('\n🗑️  Deleting orphaned files...');
  let deletedCount = 0;
  let failedCount = 0;
  let deletedSize = 0;

  for (const { key, size } of orphanDetails) {
    const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    const res = await fetch(s3Url, { method: 'DELETE' });
    if (res.ok || res.status === 204 || res.status === 404) {
      console.log(`  ✅ Deleted: ${key}`);
      deletedCount++;
      deletedSize += size;
    } else {
      const text = await res.text().catch(() => '');
      console.error(`  ❌ Failed: ${key} (${res.status}: ${text.slice(0, 80)})`);
      failedCount++;
    }
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log(`✅ Deleted: ${deletedCount} files (${(deletedSize / 1024 / 1024).toFixed(1)} MB freed)`);
  if (failedCount > 0) console.log(`❌ Failed:  ${failedCount} files`);
  console.log('─────────────────────────────────────────────────────\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
