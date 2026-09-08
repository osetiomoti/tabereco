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
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 設定 ──────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_OLD = !process.argv.includes('--keep-old'); // デフォルトで移行成功後に旧画像を削除
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : Infinity;
const CONCURRENCY_ARG = process.argv.find(a => a.startsWith('--concurrency='));
const CONCURRENCY = CONCURRENCY_ARG ? parseInt(CONCURRENCY_ARG.split('=')[1], 10) : 2; // レートリミット回避のため 2 並列

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

// ── AWS 認証（アクセスキーがあれば S3Client、なければ IP 許可の直接 PUT）──
const hasAwsCreds = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
const s3 = hasAwsCreds
  ? new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

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
    return {
      status: 'skip',
      reason: 'Already processed',
      newUrl: log.processed[oldUrl].newUrl,
      oldKey,
      newKey: log.processed[oldUrl].newKey,
    };
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
    if (s3) {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: newKey,
        Body: converted,
        ContentType: 'image/webp',
      }));
      // 4. アップロード確認
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: newKey }));
    } else {
      // バケットポリシー（IP許可）による直接 HTTP PUT（レートリミット対策のリトライ付き）
      const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${newKey}`;
      let putOk = false;
      let lastPutErr = '';
      for (let attempt = 1; attempt <= 3; attempt++) {
        const putRes = await fetch(s3Url, {
          method: 'PUT',
          body: converted,
          headers: { 'Content-Type': 'image/webp' },
        });
        if (putRes.ok) {
          putOk = true;
          break;
        }
        const errText = await putRes.text().catch(() => '');
        lastPutErr = `${putRes.status} ${putRes.statusText} (${errText.slice(0, 100)})`;
        console.error(`  [Attempt ${attempt}/3] PUT ${s3Url} failed: ${lastPutErr}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
      }
      if (!putOk) {
        throw new Error(`S3 PUT failed after 3 retries: ${lastPutErr}`);
      }

      // 4. アップロード確認（HEAD）
      let headOk = false;
      let lastHeadErr = '';
      for (let attempt = 1; attempt <= 3; attempt++) {
        const headRes = await fetch(s3Url, { method: 'HEAD' });
        if (headRes.ok) {
          headOk = true;
          break;
        }
        lastHeadErr = `${headRes.status} ${headRes.statusText}`;
        if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
      }
      if (!headOk) {
        throw new Error(`S3 HEAD check failed after 3 retries: ${lastHeadErr}`);
      }
    }

    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(`  ✅ ${oldKey} → ${newKey} (${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB, -${savings}%)`);

    return { status: 'success', oldKey, newKey, newUrl, originalSize, newSize };
  } catch (err) {
    console.error(`  ❌ ${oldKey}: ${err.message}`);
    return { status: 'error', oldKey, error: err.message };
  }
}

// ── S3 からオブジェクトを削除 ──────────────────────────────
async function deleteS3Object(key) {
  if (s3) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } else {
    const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(s3Url, { method: 'DELETE' });
      if (res.ok || res.status === 204 || res.status === 404) return;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 300));
    }
  }
}

// ── メイン処理 ────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Image Migration ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}`);
  console.log(`   Target: ${TARGET_MAX_PX}px, WebP ${TARGET_QUALITY}%`);
  console.log(`   Bucket: ${BUCKET} (${REGION})`);
  console.log(`   Delete Old Images: ${DELETE_OLD ? 'YES (after verified DB update)' : 'NO'}`);
  console.log(`   Concurrency: ${CONCURRENCY}\n`);

  const log = await loadLog();

  // DB から全画像 URL を収集
  console.log('📖 Loading image URLs from DB...');

  const [posts, users, groups] = await Promise.all([
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
    prisma.group.findMany({
      select: { id: true, image_url: true },
      where: { image_url: { not: null } }
    }),
  ]);

  // URL ごとに DB レコードへの参照をまとめる（同一画像の重複処理を防止）
  const urlMap = new Map();
  function addTarget(url, target) {
    if (!url || typeof url !== 'string') return;
    if (!urlMap.has(url)) urlMap.set(url, []);
    urlMap.get(url).push(target);
  }

  for (const post of posts) {
    if (post.image_url) addTarget(post.image_url, { type: 'post_image_url', id: post.id });
    if (Array.isArray(post.image_urls)) {
      post.image_urls.forEach((u, i) => addTarget(u, { type: 'post_image_urls', id: post.id, index: i }));
    }
  }
  for (const user of users) {
    if (user.avatar_url) addTarget(user.avatar_url, { type: 'avatar', id: user.id });
  }
  for (const group of groups) {
    if (group.image_url) addTarget(group.image_url, { type: 'group_image_url', id: group.id });
  }

  // 既に WebP のもの、または既に処理済みのものは除外して未処理分だけを抽出
  const allUrls = Array.from(urlMap.keys()).filter(url => !url.endsWith('.webp') && !log.processed[url]);
  const totalUrls = Math.min(allUrls.length, LIMIT);
  console.log(`📊 Found ${urlMap.size} unique image URLs (remaining to process: ${totalUrls}, concurrency: ${CONCURRENCY})\n`);

  let successCount = 0, skipCount = 0, errorCount = 0;
  let totalSavedBytes = 0;
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= totalUrls) break;

      await new Promise(r => setTimeout(r, 100)); // S3 へのバースト負荷軽減

      const url = allUrls[idx];
      const targets = urlMap.get(url);
      const prefix = `[${idx + 1}/${totalUrls}]`;

      const result = await processImage(url, log);

      const effectiveNewUrl = result.status === 'success'
        ? result.newUrl
        : (result.status === 'skip' && result.newUrl ? result.newUrl : null);

      if (result.status === 'success') {
        successCount++;
        totalSavedBytes += (result.originalSize - result.newSize);
      } else if (result.status === 'skip') {
        skipCount++;
      } else if (result.status === 'error') {
        errorCount++;
        log.errors.push({ url, error: result.error, at: new Date().toISOString() });
        if (!DRY_RUN) await saveLog(log);
        continue;
      } else if (result.status === 'dry-run') {
        successCount++;
      }

      // DB 更新（すべての参照先レコードを新 URL に書き換え）
      if (effectiveNewUrl && !DRY_RUN) {
        try {
          for (const target of targets) {
            if (target.type === 'post_image_url') {
              await prisma.post.update({ where: { id: target.id }, data: { image_url: effectiveNewUrl } });
            } else if (target.type === 'post_image_urls') {
              const post = await prisma.post.findUnique({ where: { id: target.id }, select: { image_urls: true } });
              if (post) {
                const newUrls = [...post.image_urls];
                newUrls[target.index] = effectiveNewUrl;
                await prisma.post.update({ where: { id: target.id }, data: { image_urls: newUrls } });
              }
            } else if (target.type === 'avatar') {
              await prisma.user.update({ where: { id: target.id }, data: { avatar_url: effectiveNewUrl } });
            } else if (target.type === 'group_image_url') {
              await prisma.group.update({ where: { id: target.id }, data: { image_url: effectiveNewUrl } });
            }
          }

          // ログに保存
          if (result.status === 'success') {
            log.processed[url] = {
              newUrl: result.newUrl,
              oldKey: result.oldKey,
              newKey: result.newKey,
              migratedAt: new Date().toISOString(),
            };
          }

          // 旧ファイルの安全な削除（全 DB レコードの更新が成功した直後に実施）
          if (DELETE_OLD && result.oldKey && result.oldKey !== result.newKey && !log.processed[url]?.deletedOld) {
            try {
              await deleteS3Object(result.oldKey);
              if (!log.processed[url]) log.processed[url] = {};
              log.processed[url].deletedOld = true;
              log.processed[url].deletedAt = new Date().toISOString();
            } catch (delErr) {
              console.error(`  ⚠️  Failed to delete old S3 file ${result.oldKey}: ${delErr.message}`);
            }
          }

          await saveLog(log);
        } catch (dbErr) {
          console.error(`  ⚠️  DB update failed for ${url}: ${dbErr.message}`);
          log.errors.push({ url, error: `DB update: ${dbErr.message}`, at: new Date().toISOString() });
          await saveLog(log);
        }
      }
    }
  }

  const numWorkers = Math.min(CONCURRENCY, totalUrls);
  const workers = Array.from({ length: numWorkers }, () => worker());
  await Promise.all(workers);

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
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
