import { createClient } from '@/lib/supabase/client';
import type { Post, PostInsert, PostUpdate, PostStatus, Tag } from '@/lib/types';

// ─── 共通ヘルパー ──────────────────────────────────────────

const DEFAULT_MOCK_USER_ID = 'b2542c51-c20c-4843-abd6-9e267e84a25c';

async function getAuthUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user && process.env.NODE_ENV === 'development') {
    let mockId = DEFAULT_MOCK_USER_ID;
    if (typeof window !== 'undefined') {
      const override = localStorage.getItem('mock_user_id');
      if (override) mockId = override;
    }
    // 開発環境用の実際のユーザーID (テスト・デバッグ用)
    return { id: mockId, email: 'dev@example.com' };
  }
  
  return user;
}

// ─── 画像アップロード ─────────────────────────────────────

export async function uploadImage(file: File): Promise<string> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error('認証が必要です');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('meal-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error('画像のアップロードに失敗しました: ' + error.message);

  const { data } = supabase.storage.from('meal-images').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function replaceImage(oldUrl: string, newFile: File): Promise<string> {
  const supabase = createClient();
  try {
    const oldPath = new URL(oldUrl).pathname
      .split('/storage/v1/object/public/meal-images/')[1];
    if (oldPath) {
      await supabase.storage.from('meal-images').remove([oldPath]);
    }
  } catch {
    // 無視
  }
  return uploadImage(newFile);
}

// ─── CRUD ────────────────────────────────────────────────

export async function getPosts(filters?: {
  status?: PostStatus;
  keyword?: string;
  tag_id?: string;
  tag_name?: string; // 名前での絞り込みを追加
  startDate?: string;
  endDate?: string;
  is_favorite?: boolean;
  address?: string;
}): Promise<Post[]> {
  const supabase = createClient();
  const user = await getAuthUser();
  let query = supabase
    .from('posts')
    .select('*, tags(id, name)')
    .order('visited_at', { ascending: false });

  if (user) {
    query = query.eq('user_id', user.id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.is_favorite !== undefined) {
    query = query.eq('is_favorite', filters.is_favorite);
  }

  if (filters?.startDate) {
    query = query.gte('visited_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('visited_at', filters.endDate);
  }

  if (filters?.keyword) {
    query = query.or(`title.ilike.%${filters.keyword}%,comment.ilike.%${filters.keyword}%,store_name.ilike.%${filters.keyword}%`);
  }

  if (filters?.address) {
    query = query.ilike('address', `%${filters.address}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let results = data as Post[];

  // タグ名でフィルタリング
  if (filters?.tag_name) {
    results = results.filter(post => 
      post.tags?.some(t => t.name === filters.tag_name)
    );
  }

  return results || [];
}

export async function getPost(id: string): Promise<Post | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*, tags(id, name)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Post;
}

export async function createPost(
  values: Omit<PostInsert, 'user_id'>,
  tagNames?: string[]
): Promise<Post> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error('認証が必要です');

  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({ ...values, user_id: user.id })
    .select()
    .single();

  if (postError) throw new Error(postError.message);
  if (!post) throw new Error('投稿の作成に成功しましたが、情報の取得に失敗しました。RLSの設定（SELECT権限）を確認してください。');

  if (tagNames?.length) {
    await syncPostTags(post.id, user.id, tagNames);
  }

  const result = await getPost(post.id);
  if (!result) {
    if (process.env.NODE_ENV === 'development') {
      // 開発環境では RLS 制限等で取得できなくても、作成した基本データを返して続行
      return post as Post;
    }
    throw new Error('投稿は作成されましたが、最終的なデータの再取得に失敗しました。');
  }
  return result;
}

export async function updatePost(
  id: string,
  values: PostUpdate,
  tagNames?: string[]
): Promise<Post> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error('認証が必要です');

  const { error: postError } = await supabase
    .from('posts')
    .update(values)
    .eq('id', id);

  if (postError) throw new Error(postError.message);

  if (tagNames) {
    await syncPostTags(id, user.id, tagNames);
  }

  const result = await getPost(id);
  if (!result) {
    if (process.env.NODE_ENV === 'development') {
      return { id, ...values } as Post;
    }
    throw new Error('投稿は更新されましたが、最終的なデータの再取得に失敗しました。');
  }
  return result;
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('posts')
    .update({ is_favorite: isFavorite })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── タグ管理 ──────────────────────────────────────────────

async function syncPostTags(postId: string, userId: string, tagNames: string[]) {
  const supabase = createClient();
  await supabase.from('post_tags').delete().eq('post_id', postId);
  if (tagNames.length === 0) return;

  const tagsToUpsert = tagNames.map(name => ({ user_id: userId, name: name.trim() }));
  const { data: upsertedTags, error: tagError } = await supabase
    .from('tags')
    .upsert(tagsToUpsert, { onConflict: 'user_id, name' })
    .select();

  if (tagError) throw new Error('タグの保存に失敗しました');

  const postTags = upsertedTags.map(tag => ({ post_id: postId, tag_id: tag.id }));
  const { error: linkError } = await supabase.from('post_tags').insert(postTags);
  if (linkError) throw new Error('投稿とタグの紐付けに失敗しました');
}

export async function getUserTags(): Promise<Tag[]> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Tag[] || [];
}

export async function deleteTag(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateTagName(id: string, newName: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tags').update({ name: newName }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateTagOrder(tagOrders: { id: string; sort_order: number }[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tags').upsert(tagOrders);
  if (error) throw new Error(error.message);
}

export async function deletePost(id: string, imageUrl: string): Promise<void> {
  const supabase = createClient();
  try {
    const path = new URL(imageUrl).pathname
      .split('/storage/v1/object/public/meal-images/')[1];
    if (path) await supabase.storage.from('meal-images').remove([path]);
  } catch {
    // 無視
  }
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
