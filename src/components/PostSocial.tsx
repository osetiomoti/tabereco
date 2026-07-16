'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Bookmark, BookmarkCheck, Star, Send, Trash2, User, ChevronDown } from 'lucide-react';
import { StarDisplay } from './StarRating';

// ── Want-to-Go Button ────────────────────────────────────
type WantToGoButtonProps = {
  postId: string;
  isOwner: boolean;
};

export function WantToGoButton({ postId, isOwner }: WantToGoButtonProps) {
  const [isMarked, setIsMarked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; name: string; avatar_url?: string }[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}/want-to-go`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setIsMarked(j.data.isMarked);
          setCount(j.data.count);
          setUsers(j.data.users);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [postId]);

  const toggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/posts/${postId}/want-to-go`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setIsMarked(json.marked);
        // re-fetch to get updated user list
        const updated = await fetch(`/api/posts/${postId}/want-to-go`).then((r) => r.json());
        if (updated.success) {
          setCount(updated.data.count);
          setUsers(updated.data.users);
        }
      }
    } finally {
      setToggling(false);
    }
  };

  if (isOwner) return null;
  if (loading) return null;

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[13px] transition-all active:scale-95 ${
              isMarked
                ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-500'
            }`}
          >
            {isMarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {isMarked ? '行きたいに登録済み' : '行きたいに追加'}
          </button>
        </div>
        {count > 0 && (
          <button
            onClick={() => setShowUsers((v) => !v)}
            className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-orange-500 transition-colors"
          >
            <span className="bg-orange-100 text-orange-500 font-black px-2 py-0.5 rounded-full text-[11px]">
              {count}人
            </span>
            が行きたい
            <ChevronDown
              size={13}
              className={`transition-transform ${showUsers ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {showUsers && users.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {u.avatar_url ? (
                  <Image src={u.avatar_url} alt={u.name} width={24} height={24} className="object-cover" />
                ) : (
                  <User size={12} className="text-gray-400" />
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700">{u.name}</span>
            </div>
          ))}
        </div>
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
  ownerRating: number;
};

function StarSelect({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const STARS = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[10px] text-gray-400 font-bold mr-1 hover:text-red-400 transition-colors"
        >
          評価なし
        </button>
      )}
      {STARS.map((s) => {
        const isFull = value !== null && s <= value;
        const isHalf = value !== null && !isFull && s - 0.5 <= value;
        return (
          <div key={s} className="relative w-7 h-7 flex">
            <button
              type="button"
              onClick={() => onChange(s - 0.5)}
              className="w-3.5 h-7 absolute left-0 z-10"
            />
            <button
              type="button"
              onClick={() => onChange(s)}
              className="w-3.5 h-7 absolute right-0 z-10"
            />
            <Star
              size={26}
              className={`${isFull || isHalf ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
            />
          </div>
        );
      })}
      {value !== null && (
        <span className="text-sm font-black text-orange-500 ml-1">{value.toFixed(1)}</span>
      )}
    </div>
  );
}

export function CommentsSection({
  postId,
  postOwnerId,
  currentUserId,
  ownerRating,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        body: JSON.stringify({ content, rating }),
      });
      const json = await res.json();
      if (json.success) {
        setContent('');
        setRating(null);
        fetchComments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, { method: 'DELETE' });
    fetchComments();
  };

  // Calculate average rating from comments
  const ratingComments = comments.filter((c) => c.rating != null);
  const avgRating =
    ratingComments.length > 0
      ? ratingComments.reduce((sum, c) => sum + (c.rating ?? 0), 0) / ratingComments.length
      : null;

  const isOwner = currentUserId === postOwnerId;

  return (
    <div className="mt-2">
      {/* Section header */}
      <div className="bg-[#a68c7e] text-white px-5 py-3 font-bold text-sm tracking-widest">
        みんなのコメント
      </div>

      {/* Average ratings block */}
      {avgRating !== null && (
        <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 mb-2 tracking-wider">みんなの評価平均</p>
          <div className="flex items-center gap-3">
            <StarDisplay rating={avgRating} size="md" />
            <span className="text-[12px] text-gray-500 font-bold">
              ({ratingComments.length}件の評価)
            </span>
          </div>
          {/* Compare with owner's rating */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400">投稿者の評価:</span>
              <StarDisplay rating={ownerRating} size="xs" />
            </div>
          </div>
        </div>
      )}

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
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 mt-0.5">
                  {c.user.avatar_url ? (
                    <Image
                      src={c.user.avatar_url}
                      alt={c.user.name}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <User size={14} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-black text-gray-800">{c.user.name}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.created_at).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {currentUserId === c.user.id && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="ml-auto text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {c.rating != null && (
                    <div className="mb-1.5">
                      <StarDisplay rating={c.rating} size="xs" />
                    </div>
                  )}
                  <p className="text-[13px] text-gray-600 leading-relaxed">{c.content}</p>
                </div>
              </div>
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
            <StarSelect value={rating} onChange={setRating} />
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
