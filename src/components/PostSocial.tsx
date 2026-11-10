'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/image';
import { Bookmark, BookmarkCheck, Star, Send, Trash2, User, ChevronDown, Pencil, X, ThumbsUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { buildNewPostUrlFromStore } from '@/lib/storeUtils';
import { StarDisplay, StarInput } from './StarRating';
import { VisitedModal } from './VisitedModal';
import { VisitChoiceModal } from './VisitChoiceModal';

// ── Rating and Actions (Visited / Want-to-Go) ────────────────────────────────────
type RatingAndActionsProps = {
  postId: string;
  post?: any;  // 新規投稿フォームへの遷移に使用
  isOwner: boolean;
  ownerRating: number | null;
  ownerVisitCount?: number;
};

export function RatingAndActions({ postId, post, isOwner, ownerRating, ownerVisitCount = 1 }: RatingAndActionsProps) {
  const router = useRouter();
  const [wtgMarked, setWtgMarked] = useState(false);
  const [wtgCount, setWtgCount] = useState(0);
  const [wtgUsers, setWtgUsers] = useState<any[]>([]);
  const [showWtgUsers, setShowWtgUsers] = useState(false);
  const [wtgToggling, setWtgToggling] = useState(false);

  const [visMarked, setVisMarked] = useState(false);
  const [visCount, setVisCount] = useState(0);
  const [visUsers, setVisUsers] = useState<any[]>([]);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [myVisitCount, setMyVisitCount] = useState<number>(1);
  const [localOwnerVisitCount, setLocalOwnerVisitCount] = useState<number>(ownerVisitCount);
  const [pendingRating, setPendingRating] = useState<number | null>(null); // unsaved local edit
  const [showRatingInput, setShowRatingInput] = useState(false); // user explicitly toggled rating section
  const [showVisUsers, setShowVisUsers] = useState(false);
  const [visToggling, setVisToggling] = useState(false);
  const [showRatingDetails, setShowRatingDetails] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);

  // Like state (for non-owner)
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeToggling, setLikeToggling] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isVisitedModalOpen, setIsVisitedModalOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [myComment, setMyComment] = useState<string | null>(null);
  const [myImageUrl, setMyImageUrl] = useState<string | null>(null);
  const [myImageUrls, setMyImageUrls] = useState<string[]>([]);
  const [myVisitedAt, setMyVisitedAt] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const requests: Promise<any>[] = [
        fetch(`/api/posts/${postId}/want-to-go`).then(r => r.json()),
        fetch(`/api/posts/${postId}/visited`).then(r => r.json()),
      ];
      if (!isOwner) {
        requests.push(fetch(`/api/posts/${postId}/like`).then(r => r.json()));
      }
      const [wtgRes, visRes, likeRes] = await Promise.all(requests);
      if (wtgRes.success) {
        setWtgMarked(wtgRes.data.isMarked);
        setWtgCount(wtgRes.data.count);
        setWtgUsers(wtgRes.data.users);
      }
      if (visRes.success) {
        setVisMarked(visRes.data.isMarked);
        setVisCount(visRes.data.count);
        setVisUsers(visRes.data.users);
        setMyRating(visRes.data.myRating);
        setPendingRating(visRes.data.myRating);
        setMyVisitCount(visRes.data.myVisitCount);
        setMyComment(visRes.data.myComment ?? null);
        setMyImageUrl(visRes.data.myImageUrl ?? null);
        setMyImageUrls(visRes.data.myImageUrls ?? []);
        setMyVisitedAt(visRes.data.myVisitedAt ?? null);
      }
      if (likeRes?.success) {
        setLikeCount(likeRes.data.count);
        setIsLiked(likeRes.data.isLiked);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const toggleWtg = async () => {
    if (wtgToggling) return;
    setWtgToggling(true);
    try {
      await fetch(`/api/posts/${postId}/want-to-go`, { method: 'POST' });
      fetchData();
    } finally {
      setWtgToggling(false);
    }
  };

  const handleVisitedClick = () => {
    if (visMarked) {
      // 行った済み → VisitedModal を直接開く（編集）
      setIsVisitedModalOpen(true);
    } else {
      // 未登録 → 記録方法の選択モーダルを開く
      setIsChoiceModalOpen(true);
    }
  };

  const handleQuickVisit = async () => {
    // 「行ったのみ記録」: 詳細なしで即座に登録
    const res = await fetch(`/api/posts/${postId}/visited`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMarked: true }),
    });
    if (res.ok) {
      setIsChoiceModalOpen(false);
      fetchData();
    }
  };

  const toggleLike = async () => {
    if (likeToggling) return;
    setLikeToggling(true);
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      if (!res.ok) {
        // revert
        setIsLiked(wasLiked);
        setLikeCount(c => wasLiked ? c + 1 : c - 1);
      } else {
        fetchData();
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
    } finally {
      setLikeToggling(false);
    }
  };

  const saveRating = async () => {
    setRatingSaving(true);
    try {
      await fetch(`/api/posts/${postId}/visited`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: pendingRating })
      });
      setMyRating(pendingRating);
      // Refresh to update averages
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRatingSaving(false);
    }
  };

  const clearRating = async () => {
    setRatingSaving(true);
    try {
      await fetch(`/api/posts/${postId}/visited`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: null })
      });
      setMyRating(null);
      setPendingRating(null);
      setShowRatingInput(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRatingSaving(false);
    }
  };

  const allRatings = visUsers.filter(u => u.rating != null).map(u => u.rating as number);
  if (ownerRating != null && ownerRating > 0) allRatings.push(ownerRating);
  const avgRating = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null;

  const ratingChanged = pendingRating !== myRating;

  const updateVisitCount = async (action: 'increment' | 'decrement') => {
    if (visToggling) return;
    setVisToggling(true);
    try {
      if (isOwner) {
        let newCount = localOwnerVisitCount;
        if (action === 'increment') newCount++;
        if (action === 'decrement' && newCount > 1) newCount--;
        setLocalOwnerVisitCount(newCount);
        
        await fetch(`/api/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visit_count: newCount })
        });
      } else {
        const res = await fetch(`/api/posts/${postId}/visited`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (data.success && data.data) {
          setMyVisitCount(data.data.visit_count);
          fetchData();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVisToggling(false);
    }
  };

  if (loading) return null;

  return (
    <div>
      {!isOwner && (
        <div className="px-4 py-4 border-b border-gray-100 bg-white">
          <div className="flex flex-col gap-3">
            {/* Action buttons row */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleVisitedClick}
                disabled={visToggling}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[13px] transition-all active:scale-95 ${
                  visMarked
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-500'
                }`}
              >
                <BookmarkCheck size={16} />
                {visMarked ? '行ったに追加済み' : '行ったに追加'}
              </button>
              
              <button
                onClick={toggleWtg}
                disabled={wtgToggling}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[13px] transition-all active:scale-95 ${
                  wtgMarked
                    ? 'bg-orange-100 text-orange-600 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-500'
                }`}
              >
                {wtgMarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {wtgMarked ? '行きたいに追加済み' : '行きたいに追加'}
              </button>
            </div>

            {/* Like button row */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLike}
                disabled={likeToggling}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[13px] transition-all active:scale-95 ${
                  isLiked
                    ? 'bg-pink-500 text-white shadow-md shadow-pink-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-500'
                }`}
              >
                <ThumbsUp size={16} className={isLiked ? 'fill-white' : ''} />
                {isLiked ? `グッド！ (${likeCount})` : `グッド (${likeCount})`}
              </button>

              {/* Rating toggle button - always visible */}
              <button
                onClick={() => setShowRatingInput(v => !v)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[13px] transition-all active:scale-95 ${
                  showRatingInput
                    ? 'bg-yellow-400 text-white shadow-sm'
                    : myRating != null
                      ? 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600'
                }`}
              >
                <Star size={16} className={showRatingInput || myRating != null ? 'fill-current' : ''} />
                {myRating != null ? `評価: ${myRating.toFixed(1)}` : '評価する'}
              </button>
            </div>

            {/* Rating Input - shown only when user toggles it */}
            {showRatingInput && (
              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[12px] font-bold text-orange-800">あなたの評価</label>
                  {myRating !== null && (
                    <button
                      onClick={clearRating}
                      disabled={ratingSaving}
                      className="text-[10px] text-gray-400 font-bold hover:text-red-400"
                    >
                      評価をクリア
                    </button>
                  )}
                </div>
                <StarInput value={pendingRating ?? 3.0} onChange={(val) => setPendingRating(val)} />
                <button
                  onClick={saveRating}
                  disabled={ratingSaving || !ratingChanged}
                  className={`mt-3 w-full py-2.5 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    ratingChanged && !ratingSaving
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-200 hover:bg-orange-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {ratingSaving ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Star size={14} />
                      評価を保存
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 訪問回数 UI (オーナーまたは行った追加済みのユーザーに表示) */}
      {(isOwner || (!isOwner && visMarked)) && (
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
          <span className="text-[13px] font-black text-gray-700 tracking-widest">
            {isOwner ? '訪問回数' : 'あなたの訪問回数'}
          </span>
          <div className="flex items-center gap-4 bg-gray-50 rounded-full p-1 border border-gray-200">
            <button
              onClick={() => updateVisitCount('decrement')}
              disabled={visToggling || (isOwner ? localOwnerVisitCount <= 1 : myVisitCount <= 1)}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm border border-gray-100 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <span className="text-lg font-bold leading-none select-none">−</span>
            </button>
            <span className="text-[14px] font-black text-gray-800 w-8 text-center select-none">
              {isOwner ? localOwnerVisitCount : myVisitCount}回
            </span>
            <button
              onClick={() => updateVisitCount('increment')}
              disabled={visToggling}
              className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100 hover:bg-orange-100 transition-colors"
            >
              <span className="text-lg font-bold leading-none select-none">＋</span>
            </button>
          </div>
        </div>
      )}

      {avgRating !== null && (
        <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => setShowRatingDetails(!showRatingDetails)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 mb-2 tracking-wider">全体の評価平均</p>
              <div className="flex items-center gap-3">
                <StarDisplay rating={avgRating} size="md" />
                <span className="text-[12px] text-gray-500 font-bold">
                  ({allRatings.length}件の評価)
                </span>
              </div>
            </div>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${showRatingDetails ? 'rotate-180' : ''}`} />
          </div>

          {showRatingDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200/60 animate-in fade-in duration-300">
              <p className="text-[11px] font-bold text-gray-500 mb-3">評価の詳細</p>
              <div className="space-y-3">
                {/* Owner Rating */}
                {ownerRating != null && ownerRating > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] text-orange-600">主</span>
                      投稿者
                    </div>
                    <StarDisplay rating={ownerRating} size="xs" />
                  </div>
                )}
                {/* Visited Users Ratings */}
                {visUsers.filter(u => u.rating != null).map(u => (
                  <div key={u.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                        {u.avatar_url ? (
                          <Image src={getImageUrl(u.avatar_url)} alt={u.name} width={20} height={20} className="object-cover" unoptimized />
                        ) : (
                          <User size={10} className="text-gray-400" />
                        )}
                      </div>
                      {u.name}
                    </div>
                    <StarDisplay rating={u.rating} size="xs" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isChoiceModalOpen && (
        <VisitChoiceModal
          isOpen={isChoiceModalOpen}
          storeName={post?.store_name || post?.title}
          onClose={() => setIsChoiceModalOpen(false)}
          onDetailRecord={() => {
            setIsChoiceModalOpen(false);
            if (post) {
              // タイムラインと同じ動作：新規投稿フォームへ遷移（タグなど全入力可能）
              router.push(buildNewPostUrlFromStore(post));
            } else {
              // post情報がない場合は従来のVisitedModalにフォールバック
              setIsVisitedModalOpen(true);
            }
          }}
          onQuickVisit={handleQuickVisit}
        />
      )}

      {isVisitedModalOpen && (
        <VisitedModal
          isOpen={isVisitedModalOpen}
          postId={postId}
          storeName={post?.store_name || post?.title}
          onClose={() => setIsVisitedModalOpen(false)}
          initialData={{
            rating: myRating,
            comment: myComment,
            imageUrl: myImageUrl,
            imageUrls: myImageUrls,
            visitedAt: myVisitedAt,
            isMarked: visMarked,
          }}
          onSuccess={() => {
            fetchData();
          }}
          onDeleted={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ── Comments Section ────────────────────────────────────
type CommentUser = { id: string; name: string; avatar_url?: string };
type Comment = {
  id: string;
  content: string;
  rating?: number | null;
  created_at: string;
  user: CommentUser;
};

type CommentsSectionProps = {
  postId: string;
  postOwnerId: string;
  currentUserId: string | null;
};



export function CommentsSection({
  postId,
  postOwnerId,
  currentUserId,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchComments = () => {
    fetch(`/api/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setComments(j.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchComments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.success) {
        setContent('');
        fetchComments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (c: Comment) => {
    setEditingCommentId(c.id);
    setEditContent(c.content);
  };

  const handleEditSubmit = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingCommentId(null);
        fetchComments();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('コメントを削除しますか？')) return;
    await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, { method: 'DELETE' });
    fetchComments();
  };

  const isOwner = currentUserId === postOwnerId;

  return (
    <div className="mt-2">
      {/* Section header */}
      <div className="bg-[#a68c7e] text-white px-5 py-3 font-bold text-sm tracking-widest">
        みんなのコメント
      </div>

      {/* Comment list */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-5 py-6 flex justify-center">
            <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-300 text-[13px] font-bold">
            まだコメントがありません
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="px-5 py-4">
              {editingCommentId === c.id ? (
                // Edit mode
                <form onSubmit={(e) => handleEditSubmit(e, c.id)} className="bg-white p-3 rounded-2xl border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[11px] font-bold text-gray-400 tracking-wider">コメントを編集</p>
                    <button type="button" onClick={() => setEditingCommentId(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mb-3">
                    {/* Rating logic removed from comments */}
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="コメントを入力..."
                      rows={2}
                      className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!editContent.trim() || savingEdit}
                      className="w-10 h-10 self-end flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white rounded-xl transition-all active:scale-95 flex-shrink-0"
                    >
                      {savingEdit ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </form>
              ) : (
                // View mode
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 mt-0.5">
                    {c.user.avatar_url ? (
                      <Image src={getImageUrl(c.user.avatar_url)} alt={c.user.name} width={32} height={32} className="object-cover" unoptimized />
                    ) : (
                      <User size={14} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-black text-gray-800">{c.user.name}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </span>
                      {currentUserId === c.user.id && (
                        <div className="ml-auto flex items-center gap-2">
                          <button onClick={() => handleEditClick(c)} className="text-gray-300 hover:text-gray-600 transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Comment form — only for non-owners */}
      {currentUserId && !isOwner && (
        <form
          onSubmit={handleSubmit}
          className="px-4 py-4 bg-gray-50/30 border-t border-gray-100"
        >
          <p className="text-[11px] font-bold text-gray-400 mb-3 tracking-wider">コメントを追加</p>
          <div className="mb-3">
            {/* Rating logic removed from comments */}
          </div>
          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="コメントを入力..."
              rows={2}
              className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none font-medium"
            />
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="w-10 h-10 self-end flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white rounded-xl transition-all active:scale-95 flex-shrink-0"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
