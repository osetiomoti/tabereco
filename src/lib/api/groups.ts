import { Post } from '@/lib/types';


async function handleResponse(res: Response) {
  // 401 は body を読む前に処理（リダイレクト）
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/api/auth/logout';
    throw new Error('Unauthorized');
  }

  // body が空の場合を安全に処理
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) throw new Error(`API Request failed (${res.status})`);
    return null;
  }

  if (!res.ok) throw new Error(json.error || `API Request failed (${res.status})`);
  return json.data;
}

export async function getJoinedGroups(): Promise<any[]> {
  const res = await fetch('/api/groups');
  return handleResponse(res);
}

export async function createGroup(name: string, description?: string): Promise<any | null> {
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  return handleResponse(res);
}

export async function joinGroup(inviteCode: string): Promise<any | null> {
  const res = await fetch('/api/groups/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode }),
  });
  return handleResponse(res);
}

export async function sharePostToGroups(postId: string, groupIds: string[]) {
  // Share is now integrated into PATCH /api/posts/[id] in my current implementation logic
  // but if the component calls this directly, we might need a separate API or just update the post.
  // For compatibility, I'll update it via the post's update route if possible, 
  // or I should have implemented a separate share endpoint.
  // Actually, let's just make a small share API.
  const res = await fetch(`/api/posts/${postId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupIds }),
  });
  return handleResponse(res);
}

export async function getGroupPosts(groupId: string): Promise<Post[]> {
  const res = await fetch(`/api/groups/${groupId}/posts`);
  return handleResponse(res);
}

/**
 * DB Schema check is no longer needed in Prisma world as we use migrations
 */
export async function checkDatabaseSchema(): Promise<boolean> {
  return true;
}
