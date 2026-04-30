'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { getJoinedGroups, removeGroupMember, deleteGroup } from '@/lib/api/groups';
import { getFriends, inviteToGroup } from '@/lib/api/friends';
import { ChevronLeft, Hash, Copy, CheckCircle, Crown, User, Users, UserPlus, Check, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Group = {
  id: string;
  name: string;
  description?: string | null;
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

  const isAdmin = group?.member_role === 'admin';

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
      const [joined, membersRes, friendsData] = await Promise.all([
        getJoinedGroups(),
        fetch(`/api/groups/${id}/members`).then(r => r.json()),
        getFriends(),
      ]);
      const current = joined.find((g: any) => g.id === id);
      if (current) setGroup(current);
      if (membersRes.success) setMembers(membersRes.data);
      setFriends(friendsData ?? []);
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
              <Hash size={28} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{group.name}</h1>
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
    </>
  );
}
