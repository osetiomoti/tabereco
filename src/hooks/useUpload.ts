'use client';

import { useState, useCallback } from 'react';

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

/** Canvas-based image resize+convert to WebP (max 1280px, quality 0.8) */
async function resizeImage(file: File, maxPx = 1280, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          // Convert to WebP for optimal compression
          const name = file.name.replace(/\.[^.]+$/, '.webp');
          resolve(new File([blob], name, { type: 'image/webp' }));
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const uploadFile = useCallback(async (
    file: File,
    category: 'posts' | 'avatars' | 'groups' = 'posts'
  ): Promise<string | null> => {
    setState({ isUploading: true, progress: 0, error: null });

    try {
      // 1. Resize image client-side before upload
      const resized = await resizeImage(file);

      // 2. Upload via server-side proxy (avoids CORS, uses Identity Pool or local fallback)
      const formData = new FormData();
      formData.append('file', resized);
      formData.append('category', category);

      const res = await fetch('/api/upload/s3-proxy', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Upload failed (${res.status})`);
      }

      const json = await res.json();
      const url = json.data?.url;
      if (!url) throw new Error('No URL returned from upload');

      setState({ isUploading: false, progress: 100, error: null });
      return url;
    } catch (e: any) {
      console.error('[useUpload] Error:', e);
      setState({ isUploading: false, progress: 0, error: e.message || 'Upload failed' });
      return null;
    }
  }, []);

  return { ...state, uploadFile };
}
