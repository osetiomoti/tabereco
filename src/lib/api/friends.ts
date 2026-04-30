async function handleResponse(res: Response) {
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/api/auth/logout';
    throw new Error('Unauthorized');
  }
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch {
    if (!res.ok) throw new Error(`API failed (${res.status})`);
    return null;
  }
  if (!res.ok) throw new Error(json.error || `API failed (${res.status})`);
  return json.data;
}

export async function getFriends(): Promise<any[]> {
  const res = await fetch('/api/friends');
  return handleResponse(res) ?? [];
}

export async function addFriend(friendUserId: string): Promise<any> {
  const res = await fetch('/api/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendUserId }),
  });
  return handleResponse(res);
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
}

export async function searchUsers(q: string): Promise<any[]> {
  const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
  return handleResponse(res) ?? [];
}

export async function inviteToGroup(groupId: string, userId: string): Promise<any> {
  const res = await fetch(`/api/groups/${groupId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return handleResponse(res);
}

export async function getRankings(tag: string, userId?: string): Promise<any[]> {
  const url = userId 
    ? `/api/rankings?tag=${encodeURIComponent(tag)}&userId=${encodeURIComponent(userId)}`
    : `/api/rankings?tag=${encodeURIComponent(tag)}`;
  const res = await fetch(url);
  return handleResponse(res) ?? [];
}

export async function saveRankings(tag: string, orderedPostIds: string[]): Promise<void> {
  await fetch('/api/rankings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag, orderedPostIds }),
  });
}
