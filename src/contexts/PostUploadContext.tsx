'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { mutate, useSWRConfig } from 'swr';
import { compressImage } from '@/lib/imageCompression';
import { createPost } from '@/lib/api/posts';
import { notifyPostUpdated } from '@/lib/revalidate';

export type PostUploadStatus = 'idle' | 'compressing' | 'uploading' | 'saving' | 'success' | 'error';

export interface UploadTaskData {
  postData: any;
  tags: string[];
  orderedImages: (File | string)[];
  precompressedMap?: Map<File, File>;
  thumbnailUrl?: string | null;
}

interface PostUploadState {
  status: PostUploadStatus;
  progress: number;
  message: string;
  storeName: string;
  thumbnailUrl: string | null;
  error: string | null;
  createdPostId: string | null;
}

interface PostUploadContextType extends PostUploadState {
  startPostUpload: (data: UploadTaskData) => void;
  retryPostUpload: () => void;
  dismissBanner: () => void;
}

const PostUploadContext = createContext<PostUploadContextType | null>(null);

export function PostUploadProvider({ children }: { children: React.ReactNode }) {
  const { cache, mutate: globalMutate } = useSWRConfig();
  const [state, setState] = useState<PostUploadState>({
    status: 'idle',
    progress: 0,
    message: '',
    storeName: '',
    thumbnailUrl: null,
    error: null,
    createdPostId: null,
  });

  const lastTaskRef = useRef<UploadTaskData | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearDismissTimer = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  };

  const executeUpload = useCallback(async (data: UploadTaskData) => {
    clearDismissTimer();
    lastTaskRef.current = data;

    const { postData, tags, orderedImages, precompressedMap, thumbnailUrl } = data;
    const storeName = postData.store_name || postData.title || '新しい記録';

    // 1. 開始: 画像の最適化（圧縮）
    setState({
      status: 'compressing',
      progress: 15,
      message: '画像を最適化中...',
      storeName,
      thumbnailUrl: thumbnailUrl || null,
      error: null,
      createdPostId: null,
    });

    try {
      const filesToUpload: File[] = [];
      const fileIndices: number[] = [];

      orderedImages.forEach((item, idx) => {
        if (item instanceof File) {
          filesToUpload.push(item);
          fileIndices.push(idx);
        }
      });

      // 未圧縮ファイルがあれば並列圧縮
      const compressedFiles: File[] = await Promise.all(
        filesToUpload.map(async (f) => {
          if (precompressedMap && precompressedMap.has(f)) {
            return precompressedMap.get(f)!;
          }
          return await compressImage(f);
        })
      );

      // 2. S3への並列アップロード
      let uploadedUrls: string[] = [];
      if (compressedFiles.length > 0) {
        setState(prev => ({
          ...prev,
          status: 'uploading',
          progress: 30,
          message: `画像をアップロード中 (0/${compressedFiles.length})...`,
        }));

        let completedUploads = 0;
        const uploadPromises = compressedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', 'posts');

          const res = await fetch('/api/upload/s3-proxy', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || `画像のアップロードに失敗しました (${res.status})`);
          }

          const json = await res.json();
          const keyOrUrl = json.data?.key || json.data?.url;
          if (!keyOrUrl) throw new Error('アップロードURLの取得に失敗しました');

          completedUploads++;
          const currentProgress = 30 + Math.round((completedUploads / compressedFiles.length) * 55); // 30% -> 85%
          setState(prev => ({
            ...prev,
            progress: currentProgress,
            message: `画像をアップロード中 (${completedUploads}/${compressedFiles.length})...`,
          }));

          return keyOrUrl;
        });

        uploadedUrls = await Promise.all(uploadPromises);
      }

      // 3. 元の並び順に従ってURLを再構築
      let uploadPtr = 0;
      const finalImageUrls: string[] = [];
      for (const item of orderedImages) {
        if (typeof item === 'string') {
          finalImageUrls.push(item);
        } else {
          finalImageUrls.push(uploadedUrls[uploadPtr++]);
        }
      }

      const payload = {
        ...postData,
        image_url: finalImageUrls[0] || null,
        image_urls: finalImageUrls,
      };

      // 4. 投稿レコード作成
      setState(prev => ({
        ...prev,
        status: 'saving',
        progress: 90,
        message: '投稿を作成中...',
      }));

      const result = await createPost(payload, tags);
      if (!result?.id) {
        throw new Error('投稿の保存に失敗しました');
      }

      // 5. 成功！ SWRキャッシュを再検証してタイムラインに即時反映
      setState(prev => ({
        ...prev,
        status: 'success',
        progress: 100,
        message: '投稿が完了しました！',
        createdPostId: result.id,
      }));

      // SWR のタイムライン・投稿・マイページ関連キャッシュを即時更新 & useTimeline へイベント通知
      notifyPostUpdated({ action: 'create', postId: result.id, post: result });

      // SWRキャッシュ内の $inf$ キー（無限スクロール用キー）を直接 revalidate
      try {
        if (cache && typeof (cache as any).keys === 'function') {
          for (const k of (cache as any).keys()) {
            if (typeof k === 'string' && k.startsWith('$inf$') && k.includes('/api/timeline')) {
              globalMutate(k);
            }
          }
        }
      } catch (e) {
        console.warn('[PostUploadContext] Failed to revalidate infinite cache keys:', e);
      }

      // 4秒後にバナーを自動消去
      dismissTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, status: 'idle' }));
      }, 4000);

    } catch (err: any) {
      console.error('[PostUploadProvider] Error:', err);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message || '投稿処理中にエラーが発生しました',
        message: '投稿に失敗しました',
      }));
    }
  }, []);

  const startPostUpload = useCallback((data: UploadTaskData) => {
    executeUpload(data);
  }, [executeUpload]);

  const retryPostUpload = useCallback(() => {
    if (lastTaskRef.current) {
      executeUpload(lastTaskRef.current);
    }
  }, [executeUpload]);

  const dismissBanner = useCallback(() => {
    clearDismissTimer();
    setState(prev => ({ ...prev, status: 'idle' }));
  }, []);

  return (
    <PostUploadContext.Provider
      value={{
        ...state,
        startPostUpload,
        retryPostUpload,
        dismissBanner,
      }}
    >
      {children}
    </PostUploadContext.Provider>
  );
}

export function usePostUpload() {
  const ctx = useContext(PostUploadContext);
  if (!ctx) {
    throw new Error('usePostUpload must be used within a PostUploadProvider');
  }
  return ctx;
}
