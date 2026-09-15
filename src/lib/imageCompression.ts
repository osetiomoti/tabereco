/**
 * 高速画像リサイズ & WebP圧縮ユーティリティ
 * createImageBitmap によるオフスレッド高速デコードを活用し、メインスレッドのUI停止を防止します。
 */

function loadImageFallback(file: File): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * 画像ファイルをリサイズし、WebP形式に圧縮します
 * @param file 圧縮対象のFileオブジェクト
 * @param maxPx 長辺の最大ピクセル数（デフォルト: 1280px）
 * @param quality 圧縮品質（デフォルト: 0.8）
 */
export async function compressImage(file: File, maxPx = 1280, quality = 0.8): Promise<File> {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  // 既に小さいWebPの場合はそのまま返す
  if (file.type === 'image/webp' && file.size < 400 * 1024) {
    return file;
  }

  try {
    let width = 0;
    let height = 0;
    let drawable: ImageBitmap | HTMLImageElement | null = null;

    // 1. createImageBitmap によるオフスレッド高速デコード（対応ブラウザ）
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(file);
        width = bitmap.width;
        height = bitmap.height;
        drawable = bitmap;
      } catch (err) {
        // createImageBitmap が失敗した場合はフォールバック
        drawable = null;
      }
    }

    // 2. フォールバック: 通常の Image オブジェクト
    if (!drawable) {
      const fallback = await loadImageFallback(file);
      width = fallback.width;
      height = fallback.height;
      drawable = fallback.img;
    }

    // スケール計算（拡大はしない）
    const scale = Math.min(1, maxPx / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      if ('close' in drawable && typeof drawable.close === 'function') {
        drawable.close();
      }
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(drawable, 0, 0, targetW, targetH);

    // ImageBitmap リソースの解放
    if ('close' in drawable && typeof drawable.close === 'function') {
      drawable.close();
    }

    // WebP Blob 出力
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch (err) {
    console.warn('[compressImage] 圧縮に失敗したため元画像を使用します:', err);
    return file;
  }
}
