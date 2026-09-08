#!/usr/bin/env node
/**
 * migrate-images.mjs
 *
 * 既存の S3/CloudFront 画像を WebP (1280px, 80%) に安全に変換・再アップロードします。
 *
 * 安全設計:
 *   - 既存ファイルは削除しない（新しいキーにアップロード）
 *   - DB 更新はアップロード成功後のみ
 *   - ドライランモード (--dry-run) でシミュレーション可能
 *   - エラーはスキップしてログ記録（他の画像に影響しない）
 *   - 途中再開可能（ログファイルで処理済みをスキップ）
 *
 * 使い方:
 *   node scripts/migrate-images.mjs --dry-run    # シミュレーション
 *   node scripts/migrate-images.mjs              # 本実行
 *   node scripts/migrate-images.mjs --limit 10   # 最初の10件だけ
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 設定 ──────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : Infinity;

const TARGET_MAX_PX = 1280;
const TARGET_QUALITY = 80; // sharp uses 0-100 for webp
const LOG_FILE = path.join(__dirname, '..', 'migrate-images-log.json');

const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? '';
const REGION = process.env.AWS_REGION ?? process.env.COGNITO_REGION ?? 'ap-northeast-1';
const CF_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN ?? '';

if (!BUCKET) {
  console.error('❌ AWS_S3_BUCKET_NAME not set in environment');
  process.exit(1);
}

// ── AWS 認証（サーバーサイド環境変数から直接）────────────────
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const prisma = new PrismaClient();

// ── ログ管理 ──────────────────────────────────────────────
async function loadLog() {
  if (!existsSync(LOG_FILE)) return { processed: {}, errors: [] };
  try {
    const raw = await readFile(LOG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { processed: {}, errors: [] };
  }
}

async function saveLog(log) {
  await writeFile(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

// ── URL → S3 キー変換 ──────────────────────────────────────
function urlToS3Key(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // CloudFront URL: https://d123.cloudfront.net/users/xxx/posts/yyy.jpg
    // S3 URL: https://bucket.s3.region.amazonaws.com/key
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

// ── 新しい WebP キーを生成 ──────────────────────────────────
function toWebpKey(oldKey) {
  // 既に webp なら skip
  if (oldKey.endsWith('.webp')) return null;
  return oldKey.replace(/\.[^.]+$/, '.webp');
}

// ── 画像をダウンロード・変換・アップロード ────────────────────
async function processImage(oldUrl, log) {
  const oldKey = urlToS3Key(oldUrl);
  if (!oldKey) return { status: 'skip', reason: 'Invalid URL' };

  // 既処理チェック
  if (log.processed[oldUrl]) {
    return { status: 'skip', reason: 'Already processed', newUrl: log.processed[oldUrl].newUrl };
  }

  const newKey = toWebpKey(oldKey);
  if (!newKey) {
    return { status: 'skip', reason: 'Already WebP' };
  }

  const newUrl = CF_DOMAIN
    ? `https://${CF_DOMAIN}/${newKey}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${newKey}`;

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] ${oldKey} → ${newKey}`);
    return { status: 'dry-run', oldKey, newKey, newUrl };
  }

  try {
    // 1. ダウンロード
    const fetchUrl = CF_DOMAIN ? `https://${CF_DOMAIN}/${oldKey}` : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${oldKey}`;
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const originalSize = originalBuffer.byteLength;

    // 2. Sharp でリサイズ + WebP 変換
    const converted = await sharp(originalBuffer)
      .resize(TARGET_MAX_PX, TARGET_MAX_PX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: TARGET_QUALITY })
      .toBuffer();
    const newSize = converted.byteLength;

    // 3. S3 にアップロード
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: newKey,
      Body: converted,
      ContentType: 'image/webp',
    }));

    // 4. アップロード確認
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: newKey }));

    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(`  ✅ ${oldKey} → ${newKey} (${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB, -${savings}%)`);

    return { status: 'success', oldKey, newKey, newUrl, originalSize, newSize };
  } catch (err) {
    console.error(`  ❌ ${oldKey}: ${err.message}`);
    return { status: 'error', oldKey, error: err.message };
  }
}

// ── メイン処理 ────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Image Migration ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}`);
  console.log(`   Target: ${TARGET_MAX_PX}px, WebP ${TARGET_QUALITY}%`);
  console.log(`   Bucket: ${BUCKET} (${REGION})\n`);

  const log = await loadLog();

  // DB から全画像 URL を収集
  console.log('📖 Loading image URLs from DB...');

  const [posts, users] = await Promise.all([
    prisma.post.findMany({
      select: { id: true, image_url: true, image_urls: true },
      where: {
        OR: [
          { image_url: { not: null } },
          { image_urls: { isEmpty: false } },
        ]
      }
    }),
    prisma.user.findMany({
      select: { id: true, avatar_url: true },
      where: { avatar_url: { not: null } }
    }),
  ]);

  // 処理対象をフラットなリストに
  const tasks = [];

  for (const post of posts) {
    if (post.image_url) tasks.push({ type: 'post_image_url', id: post.id, url: post.image_url });
    for (let i = 0; i < post.image_urls.length; i++) {
      tasks.push({ type: 'post_image_urls', id: post.id, index: i, url: post.image_urls[i] });
    }
  }

  for (const user of users) {
    if (user.avatar_url) tasks.push({ type: 'avatar', id: user.id, url: user.avatar_url });
  }

  const totalTasks = Math.min(tasks.length, LIMIT);
  console.log(`📊 Found ${tasks.length} images (processing: ${totalTasks})\n`);

  let successCount = 0, skipCount = 0, errorCount = 0;
  let totalSavedBytes = 0;

  for (let i = 0; i < totalTasks; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${totalTasks}] ${task.type} (${task.id.slice(0, 8)}...)`);

    const result = await processImage(task.url, log);

    if (result.status === 'success') {
      successCount++;
      totalSavedBytes += (result.originalSize - result.newSize);

      // DB 更新（アップロード成功後のみ）
      if (!DRY_RUN) {
        try {
          if (task.type === 'post_image_url') {
            await prisma.post.update({ where: { id: task.id }, data: { image_url: result.newUrl } });
          } else if (task.type === 'post_image_urls') {
            const post = await prisma.post.findUnique({ where: { id: task.id }, select: { image_urls: true } });
            if (post) {
              const newUrls = [...post.image_urls];
              newUrls[task.index] = result.newUrl;
              await prisma.post.update({ where: { id: task.id }, data: { image_urls: newUrls } });
            }
          } else if (task.type === 'avatar') {
            await prisma.user.update({ where: { id: task.id }, data: { avatar_url: result.newUrl } });
          }

          // ログに保存（旧URL も保持）
          log.processed[task.url] = { newUrl: result.newUrl, oldKey: result.oldKey, newKey: result.newKey, migratedAt: new Date().toISOString() };
          await saveLog(log);
        } catch (dbErr) {
          console.error(`  ⚠️  DB update failed: ${dbErr.message}`);
          log.errors.push({ url: task.url, error: `DB update: ${dbErr.message}`, at: new Date().toISOString() });
          await saveLog(log);
        }
      }
    } else if (result.status === 'skip') {
      skipCount++;
    } else if (result.status === 'error') {
      errorCount++;
      log.errors.push({ url: task.url, error: result.error, at: new Date().toISOString() });
      if (!DRY_RUN) await saveLog(log);
    } else if (result.status === 'dry-run') {
      successCount++;
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors:  ${errorCount}`);
  if (!DRY_RUN && totalSavedBytes > 0) {
    console.log(`💾 Total saved: ${(totalSavedBytes / 1024 / 1024).toFixed(1)} MB`);
  }
  console.log('─────────────────────────────────────\n');

  if (!DRY_RUN) {
    console.log(`📝 Log saved to: ${LOG_FILE}`);
    console.log('⚠️  Old images are NOT deleted. Verify everything works before manually removing them.');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
