'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { getJoinedGroups, createGroup, joinGroup, Group, checkDatabaseSchema } from '@/lib/api/groups';
import { Plus, Users, Copy, CheckCircle, ChevronRight, Hash } from 'lucide-react';
import Link from 'next/link';
import { SchemaSetupHelp } from '@/components/SchemaSetupHelp';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    
    // スキーマチェック
    const isReady = await checkDatabaseSchema();
    if (!isReady) {
      setIsSchemaMissing(true);
      setLoading(false);
      return;
    }

    setIsSchemaMissing(false);
    const data = await getJoinedGroups();
    setGroups(data);
    setLoading(false);
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsCreating(true);
    const group = await createGroup(newGroupName.trim());
    if (group) {
        setNewGroupName('');
        loadGroups();
    }
    setIsCreating(false);
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsJoining(true);
    const group = await joinGroup(inviteCode.trim());
    if (group) {
        setInviteCode('');
        loadGroups();
    } else {
        alert('グループが見つからないか、既に参加しています');
    }
    setIsJoining(false);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isSchemaMissing) {
    return (
      <>
        <Header />
        <SchemaSetupHelp onCheckAgain={() => loadGroups()} />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-32 animate-in fade-in duration-700">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Users className="text-orange-500" strokeWidth={3} />
            グループ
          </h1>
          <p className="text-gray-400 font-bold mt-1">仲間とお気に入りスポットをシェアしよう</p>
        </header>

        <div className="grid grid-cols-1 gap-6 mb-12">
          {/* グループ参加セクション */}
          <section className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-[2.5rem] border border-orange-100 shadow-sm">
            <h2 className="text-sm font-black text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Plus size={16} strokeWidth={3} />
              新しいグループ
            </h2>
            <div className="space-y-4">
              <form onSubmit={handleJoinGroup} className="flex gap-2">
                <input 
                  type="text" 
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="招待コードを入力" 
                  className="flex-1 bg-white border border-orange-100/50 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={isJoining}
                  className="bg-orange-500 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isJoining ? '参加中...' : '参加する'}
                </button>
              </form>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-orange-100"></div>
                <span className="flex-shrink mx-4 text-[10px] text-orange-300 font-black uppercase">Or</span>
                <div className="flex-grow border-t border-orange-100"></div>
              </div>
              <form onSubmit={handleCreateGroup} className="flex gap-2">
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="グループ名を入力" 
                  className="flex-1 bg-white border border-orange-100/50 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="bg-white text-orange-500 border border-orange-100 px-6 py-3 rounded-2xl text-sm font-black shadow-sm hover:bg-orange-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isCreating ? '作成中...' : '新規作成'}
                </button>
              </form>
            </div>
          </section>

          {/* 参加中グループ一覧 */}
          <section className="space-y-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-2">参加中のグループ</h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-[2rem] animate-pulse"></div>)}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                <Users size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold">まだ参加しているグループがありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {groups.map(group => (
                  <div key={group.id} className="group relative">
                    <Link 
                      href={`/groups/${group.id}`}
                      className="block bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 shadow-inner">
                            <Hash size={24} strokeWidth={3} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-orange-500 transition-colors">
                              {group.name}
                            </h3>
                            <p className="text-xs text-gray-400 font-bold mt-0.5">
                              {group.description || '美味しいスポットをシェア！'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-200 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </Link>
                    
                    <button
                      onClick={() => copyToClipboard(group.invite_code)}
                      className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-gray-50 hover:bg-orange-50 text-[10px] font-black px-3 py-2 rounded-xl border border-gray-100 transition-all active:scale-95"
                    >
                      {copiedCode === group.invite_code ? (
                        <>
                          <CheckCircle size={14} className="text-green-500" />
                          <span className="text-green-600 uppercase">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-gray-400" />
                          <span className="text-gray-400 uppercase tracking-tighter">Code: {group.invite_code}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
