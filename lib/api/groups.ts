import { createClient } from '@/lib/supabase/client';
import { Post, Tag } from '@/lib/types';

export type Group = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
  member_role?: 'admin' | 'member';
};

/**
 * 招待コードを生成 (ランダム8文字)
 */
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * データベースのスキーマ（テーブル）が存在するか確認
 */
export async function checkDatabaseSchema(): Promise<boolean> {
  const supabase = createClient();
  // 試しに groups テーブルにクエリを投げてみる
  const { error } = await supabase.from('groups').select('id').limit(1);
  
  if (error && error.code === 'PGRST205') {
    return false; // テーブルが見つからない
  }
  return true; // テーブルがある（または別のエラー)
}

/**
 * ログイン中ユーザーが参加しているグループ一覧を取得
 */
export async function getJoinedGroups(): Promise<Group[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      role,
      groups (*)
    `)
    .eq('user_id', user.id);

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Groups table not found. Schema setup required.');
    } else {
      console.error('Error fetching groups:', error);
    }
    return [];
  }

  return data.map((item: any) => ({
    ...item.groups,
    member_role: item.role
  }));
}

/**
 * 新しいグループを作成
 */
export async function createGroup(name: string, description?: string): Promise<Group | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const invite_code = generateInviteCode();

  // 1. グループ作成
  const { data: group, error: gError } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      invite_code,
      created_by: user.id
    })
    .select()
    .single();

  if (gError || !group) {
    console.error('Error creating group:', gError);
    return null;
  }

  // 2. 作成者を admin として参加させる
  const { error: mError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: 'admin'
    });

  if (mError) {
    console.error('Error joining as admin:', mError);
    return null;
  }

  return group;
}

/**
 * 招待コードでグループに参加
 */
export async function joinGroup(inviteCode: string): Promise<Group | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. 招待コードに一致するグループを探す
  const { data: group, error: gError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();

  if (gError || !group) {
    console.error('Group not found with code:', inviteCode);
    return null;
  }

  // 2. 既に参加していないか確認
  const { data: existing } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single();

  if (existing) return group;

  // 3. 参加
  const { error: mError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: 'member'
    });

  if (mError) {
    console.error('Error joining group:', mError);
    return null;
  }

  return group;
}

/**
 * 特定の投稿を複数のグループにシェアする
 */
export async function sharePostToGroups(postId: string, groupIds: string[]) {
  const supabase = createClient();
  
  // 1. 既存の共有を一旦クリア (更新対応)
  await supabase.from('post_groups').delete().eq('post_id', postId);

  if (groupIds.length === 0) return;

  // 2. 新しい共有を作成
  const inserts = groupIds.map(gid => ({
    post_id: postId,
    group_id: gid
  }));

  const { error } = await supabase.from('post_groups').insert(inserts);
  if (error) console.error('Error sharing post:', error);
}

/**
 * 特定のグループにシェアされた投稿一覧を取得
 */
export async function getGroupPosts(groupId: string): Promise<Post[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('post_groups')
    .select(`
      posts (
        *,
        tags (*)
      )
    `)
    .eq('group_id', groupId)
    .order('shared_at', { foreignTable: 'posts', ascending: false });

  if (error) {
    console.error('Error fetching group posts:', error);
    return [];
  }

  return data.map((item: any) => item.posts);
}
