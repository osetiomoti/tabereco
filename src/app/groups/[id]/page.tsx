'use client';

import { use, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { getJoinedGroups, removeGroupMember, deleteGroup } from '@/lib/api/groups';
import { getFriends, inviteToGroup } from '@/lib/api/friends';
import { ChevronLeft, Hash, Copy, CheckCircle, Crown, User, Users, UserPlus, Check, Trash2, Camera, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useUpload } from '@/hooks/useUpload';

type Group = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  invite_code: string;
  created_by: string;
  member_role?: string;
};

type Member = {
  id: string;
  name: string;
  avatar_url?: string | null;
  role: string;
  joined_at: string;
};

type Friend = { id: string; name: string; avatar_url?: string | null; friendship_id: string };

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload();

  const isAdmin = group?.member_role === 'admin';

  const handleEditGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editGroupName, description: editGroupDescription }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setGroup(prev => prev ? { ...prev, name: editGroupName, description: editGroupDescription } : null);
      setIsEditingGroup(false);
    } catch (e: any) {
      alert(e.message || 'グループの更新に失敗しました');
    }
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadFile(file, 'groups');
      if (!url) throw new Error('アップロードに失敗しました');
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: group!.name, image_url: url }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setGroup(prev => prev ? { ...prev, image_url: url } : null);
    } catch (e: any) {
      alert(e.message || '画像のアップロードに失敗しました');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }, [id, isAdmin, group, uploadFile]);

  const handleSendRequest = async (friendId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendUserId: friendId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      alert('ともだちリクエストを送信しました');
      await load();
    } catch (e: any) {
      alert(e.message || 'リクエスト送信に失敗しました');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      alert('ともだちになりました！');
      await load();
    } catch (e: any) {
      alert(e.message || '承認に失敗しました');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`${memberName}さんをグループから削除しますか？`)) return;
    try {
      await removeGroupMember(id, memberId);
      await load();
    } catch (e: any) {
      alert(e.message || 'メンバーの削除に失敗しました');
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('本当にこのグループを削除しますか？\nこの操作は取り消せません。')) return;
    try {
      await deleteGroup(id);
      router.push('/groups');
    } catch (e: any) {
      alert(e.message || 'グループの削除に失敗しました');
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [joined, membersRes, friendsData, pendingData, profileRes] = await Promise.all([
        getJoinedGroups(),
        fetch(`/api/groups/${id}/members`).then(r => r.json()),
        getFriends(),
        fetch('/api/friends/pending').then(r => r.json()),
        fetch('/api/profiles/me').then(r => r.json())
      ]);
      const current = joined.find((g: any) => g.id === id);
      if (current) {
        setGroup(current);
        setEditGroupName(current.name);
        setEditGroupDescription(current.description || '');
      }
      if (membersRes.success) setMembers(membersRes.data);
      setFriends(friendsData ?? []);
      setPendingRequests(pendingData.data ?? []);
      setMyUserId(profileRes.data?.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const copyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteFriend = async (friendId: string) => {
    setInvitingId(friendId);
    try {
      await inviteToGroup(id, friendId);
      setInvitedIds(prev => new Set([...prev, friendId]));
      await load();
    } catch (e: any) {
      alert(e.message || '招待に失敗しました');
    }
    setInvitingId(null);
  };

  const memberIds = new Set(members.map(m => m.id));
  const uninvitedFriends = friends.filter(f => !memberIds.has(f.id));

  if (loading) {
    return (
      <>
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-pulse">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4" />
          <div className="h-6 w-48 bg-gray-100 rounded-full mx-auto" />
        </div>
      </>
    );
  }

  if (!group) {
    return (
      <>
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-400 font-bold">グループが見つかりませんでした</p>
          <Link href="/groups" className="text-orange-500 font-black mt-4 inline-block underline">一覧へ戻る</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 animate-in fade-in duration-700">
        <Link href="/groups" className="inline-flex items-center gap-1 text-xs font-black text-gray-400 hover:text-orange-500 transition-colors mb-6 group">
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          ともだち一覧へ戻る
        </Link>

        {/* グループヘッダー */}
        <header className="mb-8 p-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
          <div className="flex items-center gap-4 mb-4">
            {/* Group icon with upload for admin */}
            <div className="relative group/icon">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/20 overflow-hidden relative">
                {group.image_url ? (
                  <Image src={group.image_url} alt={group.name} fill className="object-cover" />
                ) : (
                  <Hash size={28} strokeWidth={3} />
                )}
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    title="グループ画像を変更"
                  >
                    {isUploadingImage
                      ? <Loader2 size={18} className="text-white animate-spin" />
                      : <Camera size={18} className="text-white" />}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                {group.name}
                {isAdmin && (
                  <button onClick={() => setIsEditingGroup(true)} className="text-gray-300 hover:text-orange-500 transition-colors">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                )}
              </h1>
              <p className="text-xs text-gray-400 font-bold">{group.description || '美味しいスポットをみんなでシェア！'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
            <span className="text-[10px] font-black text-gray-400">招待コード：</span>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-gray-50 hover:bg-orange-50 text-[10px] font-black px-4 py-1.5 rounded-full border border-gray-100 transition-all active:scale-95"
            >
              {copied ? (
                <><CheckCircle size={14} className="text-green-500" /><span className="text-green-600">コピー済み！</span></>
              ) : (
                <><Hash size={12} className="text-orange-500" /><span className="text-orange-600">{group.invite_code}</span><Copy size={12} className="text-gray-300" /></>
              )}
            </button>
          </div>
        </header>

        {/* ともだちを招待 */}
        {friends.length > 0 && (
          <section className="mb-8">
            <button
              onClick={() => setShowInvitePanel(!showInvitePanel)}
              className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-2xl transition-all mb-3"
            >
              <span className="flex items-center gap-2 text-sm font-black text-orange-600">
                <UserPlus size={16} />ともだちをグループに招待
              </span>
              <span className="text-orange-400 text-xs font-bold">{showInvitePanel ? '閉じる' : '開く'}</span>
            </button>

            {showInvitePanel && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2 animate-in slide-in-from-top-2 duration-200">
                {uninvitedFriends.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 font-bold py-4">
                    招待できるともだちがいません<br />
                    <span className="text-xs text-gray-300">既にメンバーになっているか、ともだちがいません</span>
                  </p>
                ) : (
                  uninvitedFriends.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                        {f.avatar_url
                          ? <Image src={f.avatar_url} alt={f.name} fill className="object-cover" />
                          : <User size={16} className="text-orange-400" />}
                      </div>
                      <span className="flex-1 font-bold text-sm text-gray-800 truncate">{f.name}</span>
                      {invitedIds.has(f.id) ? (
                        <span className="text-[11px] font-bold text-green-500 flex items-center gap-1">
                          <Check size={12} />追加済み
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInviteFriend(f.id)}
                          disabled={invitingId === f.id}
                          className="shrink-0 px-3 py-1.5 bg-orange-500 text-white text-[12px] font-black rounded-xl shadow-sm shadow-orange-200 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {invitingId === f.id ? '招待中...' : '招待'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )}

        {/* メンバー一覧 */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-black text-gray-500 mb-4 ml-1">
            <Users size={16} className="text-orange-500" />
            メンバー（{members.length}人）
          </h2>
          <div className="space-y-3">
            {members.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                <Users size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 font-bold text-sm">メンバーがいません</p>
              </div>
            ) : (
              members.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <Link href={`/mypage?userId=${member.id}`} className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-85 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 relative border-2 border-white shadow">
                      {member.avatar_url ? (
                        <Image src={member.avatar_url} alt={member.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                          <User size={20} className="text-orange-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900 truncate">{member.name}</p>
                        {member.role === 'admin' && (
                          <span className="flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                            <Crown size={10} />管理者
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-bold">
                        {new Date(member.joined_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}参加
                      </p>
                    </div>
                  </Link>
                  {myUserId && member.id !== myUserId && (() => {
                    const isFriend = friends.some(f => f.id === member.id);
                    const sentReq = pendingRequests.find(r => r.user?.id === member.id && r.type === 'sent');
                    const recvReq = pendingRequests.find(r => r.user?.id === member.id && r.type === 'received');

                    if (isFriend) {
                      return <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-lg shrink-0">ともだち</span>;
                    } else if (recvReq) {
                      return (
                        <button
                          onClick={() => handleAcceptRequest(recvReq.friendship_id)}
                          className="px-3 py-1.5 bg-pink-500 text-white text-[10px] font-black rounded-lg shrink-0 hover:bg-pink-600 transition-colors"
                        >
                          承認する
                        </button>
                      );
                    } else if (sentReq) {
                      return <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-lg shrink-0">リクエスト済み</span>;
                    } else {
                      return (
                        <button
                          onClick={() => handleSendRequest(member.id)}
                          className="px-3 py-1.5 bg-orange-100 text-orange-600 text-[10px] font-black rounded-lg shrink-0 hover:bg-orange-200 transition-colors flex items-center gap-1"
                        >
                          <UserPlus size={12} /> 追加
                        </button>
                      );
                    }
                  })()}
                  {isAdmin && member.role !== 'admin' && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all ml-auto"
                      title="メンバーを削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {isAdmin && (
          <section className="mt-12 pt-6 border-t border-red-100 flex flex-col items-center">
            <button
              onClick={handleDeleteGroup}
              className="flex items-center gap-2 px-6 py-3 text-red-500 bg-red-50 hover:bg-red-100 placeholder:text-sm font-black rounded-2xl transition-all shadow-sm shadow-red-100 active:scale-95"
            >
              <Trash2 size={18} />グループを削除する
            </button>
            <p className="text-[10px] text-gray-400 font-bold mt-3 text-center">
              グループを削除すると、記録された投稿のグループへの共有状態も解除されます。<br/>
              投稿自体が削除されることはありません。
            </p>
          </section>
        )}
      </main>

      {/* Edit Group Modal */}
      {isEditingGroup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsEditingGroup(false)} />
          <div className="bg-white rounded-3xl shadow-xl w-[90%] max-w-sm relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-[17px] font-black text-gray-900">グループを編集</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">グループ名</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">ひとこと（説明）</label>
                <textarea
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-200 resize-none"
                  placeholder="グループの説明..."
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50/50 flex gap-3 border-t border-gray-100">
              <button
                onClick={() => setIsEditingGroup(false)}
                className="flex-1 py-3 bg-white text-gray-500 font-black text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditGroup}
                disabled={!editGroupName.trim()}
                className="flex-1 py-3 bg-orange-500 text-white font-black text-sm rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
