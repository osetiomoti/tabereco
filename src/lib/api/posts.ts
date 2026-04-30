import { Post, PostInsert, PostUpdate, Tag } from '@/lib/types';

/**
 * Frontend API Wrapper
 * Replaces the previous Supabase client logic with standard fetch calls to the new Next.js API Routes.
 */

async function handleResponse(res: Response) {
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 401) {
      if (typeof window !== 'undefined') window.location.href = '/api/auth/logout';
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`API Request failed (${res.status})`);
    return null;
  }
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/api/auth/logout';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(json.error || `API Request failed (${res.status})`);
  return json.data;
}

export async function getPosts(filters?: any): Promise<Post[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
  }
  const res = await fetch(`/api/posts?${params.toString()}`);
  return handleResponse(res);
}

export async function getPost(id: string): Promise<Post | null> {
  const res = await fetch(`/api/posts/${id}`);
  try {
    return await handleResponse(res);
  } catch {
    return null;
  }
}

export async function createPost(values: Omit<PostInsert, 'user_id'>, tagNames?: string[]): Promise<Post> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...values, tagNames }),
  });
  return handleResponse(res);
}

export async function updatePost(id: string, values: PostUpdate, tagNames?: string[]): Promise<Post> {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...values, tagNames }),
  });
  return handleResponse(res);
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  await updatePost(id, { is_favorite: isFavorite } as any);
}

export async function getUserTags(userId?: string): Promise<Tag[]> {
  const url = userId ? `/api/tags?userId=${encodeURIComponent(userId)}` : '/api/tags';
  const res = await fetch(url);
  return handleResponse(res);
}

export async function createTag(name: string): Promise<Tag> {
  const res = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`/api/tags/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function updateTagOrder(tagOrders: { id: string; sort_order: number }[]): Promise<void> {
  const res = await fetch('/api/tags/order', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagOrders }),
  });
  await handleResponse(res);
}

export async function updateTagName(id: string, name: string): Promise<Tag> {
  const res = await fetch(`/api/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}
