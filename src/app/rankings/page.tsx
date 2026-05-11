'use client';

import { useState, useEffect } from 'react';
import { Trophy, GripVertical, Save, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { getRankings, saveRankings } from '@/lib/api/friends';
import { useMyTags, useFriends, useMyProfile } from '@/hooks/useAppData';
import type { Tag } from '@/lib/types';
import { Header } from '@/components/Header';

export default function RankingsPage() {
  const { tags: myTags } = useMyTags();
  const { friends } = useFriends();
  const { profile: myProfile } = useMyProfile();

  const [friendTags, setFriendTags] = useState<Tag[]>([]);
  const [userTags, setUserTags] = useState<Tag[]>([]);
  const [rankingTag, setRankingTag] = useState<string>('');
  const [rankingPosts, setRankingPosts] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingSaved, setRankingSaved] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  
  // Friend Selection
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 表示するタグは選択中のユーザーに依存
  useEffect(() => {
    if (selectedUserId === null) {
      // 自分のタグ（SWRキャッシュから即座）
      setUserTags(myTags);
    } else {
      // フレンドのタグ（別途フェッチが必要）
      setRankingTag('');
      setRankingPosts([]);
      import('@/lib/api/posts').then(({ getUserTags: getTagsApi }) => {
        getTagsApi(selectedUserId).then(tags => setFriendTags(tags ?? [])).catch(() => {});
      });
    }
  }, [selectedUserId, myTags]);

  // 表示するタグリスト（自分 or フレンド）
  const displayTags = selectedUserId === null ? userTags : friendTags;

  useEffect(() => {
    if (!rankingTag) return;
    setRankingLoading(true);
    setRankingSaved(false);
    getRankings(rankingTag, selectedUserId ?? undefined).then(data => {
      setRankingPosts(data ?? []);
      setRankingLoading(false);
    });
  }, [rankingTag, selectedUserId]);

  const isReadOnly = selectedUserId !== null;

  const handleDragStart = (e: React.DragEvent, i: number) => {
    if (isReadOnly) return;
    setDraggingIndex(i);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    if (isReadOnly) return;
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === i) return;
    const arr = [...rankingPosts];
    const item = arr[draggingIndex];
    arr.splice(draggingIndex, 1);
    arr.splice(i, 0, item);
    setRankingPosts(arr);
    setDraggingIndex(i);
    setRankingSaved(false);
  };
  const handleDragEnd = () => setDraggingIndex(null);

  const handleSaveRanking = async () => {
    if (isReadOnly) return;
    await saveRankings(rankingTag, rankingPosts.map(p => p.id));
    setRankingSaved(true);
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen bg-white pb-[100px]">
      <Header title="ランキング" />

      {/* User Selector */}
      <div className="flex gap-4 overflow-x-auto px-4 py-4 hide-scrollbar border-b border-gray-50 bg-gray-50/50">
        <button 
          onClick={() => setSelectedUserId(null)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div className={`w-[52px] h-[52px] rounded-full overflow-hidden border-[3px] transition-all bg-white object-cover ${selectedUserId === null ? 'border-orange-500 scale-110 shadow-md p-[2px]' : 'border-transparent opacity-70 hover:opacity-100 p-0'}`}>
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 relative">
              {myProfile?.avatar_url ? (
                <Image src={myProfile.avatar_url} alt="You" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-black truncate max-w-[60px] ${selectedUserId === null ? 'text-orange-500' : 'text-gray-400'}`}>マイランキング</span>
        </button>
        {friends.map(friend => (
          <button 
            key={friend.id}
            onClick={() => setSelectedUserId(friend.id)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className={`w-[52px] h-[52px] rounded-full overflow-hidden border-[3px] transition-all bg-white object-cover ${selectedUserId === friend.id ? 'border-orange-500 scale-110 shadow-md p-[2px]' : 'border-transparent opacity-70 hover:opacity-100 p-0'}`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 relative">
                {friend.avatar_url ? (
                  <Image src={friend.avatar_url} alt={friend.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-black truncate max-w-[60px] ${selectedUserId === friend.id ? 'text-orange-500' : 'text-gray-400'}`}>{friend.name}</span>
          </button>
        ))}
      </div>
      
      <div className="px-4 pt-6 animate-in fade-in duration-300">
        {/* タグ選択 */}
        <div className="mb-6 relative">
          <label className="text-[11px] font-black text-gray-400 tracking-widest ml-1 block mb-2">{isReadOnly ? 'ランキングを見るタグを選択' : 'ランキングするタグを選択'}</label>
          <button
            onClick={() => setShowTagDropdown(!showTagDropdown)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-left shadow-sm hover:border-orange-300 transition-colors"
          >
            <span className={rankingTag ? 'text-gray-900' : 'text-gray-400'}>
              {rankingTag ? `#${rankingTag}` : 'タグを選ぶ...'}
            </span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showTagDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showTagDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 max-h-56 overflow-y-auto">
              {displayTags.length === 0 ? (
                <p className="text-center text-sm text-gray-400 font-bold p-4">タグがありません</p>
              ) : (
                displayTags.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setRankingTag(t.name); setShowTagDropdown(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-orange-50 transition-colors ${rankingTag === t.name ? 'text-orange-500 bg-orange-50' : 'text-gray-700'}`}
                  >
                    #{t.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ランキングリスト */}
        {!rankingTag ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <Trophy size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-bold text-sm">タグを選ぶとランキングが表示されます</p>
            {!isReadOnly && <p className="text-gray-300 font-bold text-xs mt-1">ドラッグして順位を自分で設定できます</p>}
          </div>
        ) : rankingLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : rankingPosts.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-bold text-sm">#{rankingTag} が付いた記録がありません</p>
          </div>
        ) : (
          <>
            {!isReadOnly && (
              <p className="text-[11px] text-gray-400 font-bold ml-1 mb-3">
                ドラッグして順位を変更 → 保存ボタンで確定
              </p>
            )}
            <div className="space-y-2 mb-6">
              {rankingPosts.map((post, i) => (
                <div
                  key={post.id}
                  draggable={!isReadOnly}
                  onDragStart={e => handleDragStart(e, i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 bg-white border rounded-2xl p-3 transition-all ${
                    !isReadOnly ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''
                  } ${draggingIndex === i ? 'opacity-50 scale-[0.98] border-orange-300 shadow-lg' : 'border-gray-100 shadow-sm'}`}
                >
                  {/* 順位バッジ */}
                  <div className="w-8 text-center flex-shrink-0">
                    {i < 3 ? (
                      <span className="text-xl leading-none">{medals[i]}</span>
                    ) : (
                      <span className="text-sm font-black text-gray-300">{i + 1}</span>
                    )}
                  </div>

                  {/* サムネイル */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-100">
                    {post.image_url ? (
                      <Image src={post.image_url} alt={post.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>

                  {/* テキスト */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-900 truncate">{post.title}</p>
                    <p className="text-xs text-gray-400 font-bold truncate">{post.store_name}</p>
                    {post.rating && (
                      <span className="text-[11px] font-black text-orange-400">{'★'.repeat(post.rating)}</span>
                    )}
                  </div>

                  {/* ドラッグハンドル */}
                  {!isReadOnly && (
                    <div className="flex-shrink-0 text-gray-300 hover:text-gray-400 transition-colors cursor-grab">
                      <GripVertical size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 保存ボタン */}
            {!isReadOnly && (
              <button
                onClick={handleSaveRanking}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                  rankingSaved
                    ? 'bg-green-500 text-white shadow-green-200'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200'
                }`}
              >
                {rankingSaved ? (
                  <><span>✓</span>保存しました！</>
                ) : (
                  <><Save size={18} />このランキングを保存</>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
