import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles/[id]
 * Fetch user profile and posts for a given user ID (friend or group member).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (auth) => {
    try {
      const resolvedParams = await params;
      const targetUserId = resolvedParams.id;

      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
      }

      // Check if target is self
      const isSelf = auth.userId === targetUserId;
      let isFriend = false;
      let shareGroup = false;

      if (!isSelf) {
        // Check if they are friends
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { user_id: auth.userId, friend_id: targetUserId },
              { user_id: targetUserId, friend_id: auth.userId }
            ],
            status: 'accepted',
          }
        });
        isFriend = !!friendship;

        // Check if they share any groups
        if (!isFriend) {
          const myGroups = await prisma.groupMember.findMany({
            where: { user_id: auth.userId },
            select: { group_id: true }
          });
          const myGroupIds = myGroups.map(g => g.group_id);

          if (myGroupIds.length > 0) {
            const commonMember = await prisma.groupMember.findFirst({
              where: {
                user_id: targetUserId,
                group_id: { in: myGroupIds }
              }
            });
            if (commonMember) shareGroup = true;
          }
        }
      }

      // 身内（本人・フレンド・共有グループ）判定
      const isInsider = isSelf || isFriend || shareGroup;
      const relationship = isSelf ? 'self' : isFriend ? 'friend' : shareGroup ? 'group' : 'stranger';

      // Fetch user info (赤の他人にはメールアドレスは開示しない)
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, avatar_url: true, email: isInsider }
      });

      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const appType = request.cookies.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';

      // 1. ユーザー自身が作成した投稿 (is_mine_only = false)
      const rawPosts = await prisma.post.findMany({
        where: {
          user_id: targetUserId,
          is_mine_only: false,
          app_type: appType,
        },
        include: {
          user: {
            select: { id: true, name: true, avatar_url: true }
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: { visiteds: true },
          },
        },
        orderBy: {
          visited_at: 'desc',
        },
      });

      // 2. ユーザーが他人の投稿に付けた「行った」 (PostVisited)
      const rawMarkedVisiteds = await prisma.postVisited.findMany({
        where: {
          user_id: targetUserId,
          post: {
            app_type: appType,
            is_mine_only: false,
          },
        },
        include: {
          post: {
            include: {
              user: { select: { id: true, name: true, avatar_url: true } },
              tags: { include: { tag: true } },
              visiteds: {
                select: {
                  user_id: true,
                  rating: true,
                  comment: true,
                  image_url: true,
                  image_urls: true,
                  visited_at: true,
                  visit_count: true,
                  user: { select: { id: true, name: true, avatar_url: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      // 3. ユーザーが他人の投稿に付けた「行きたい」 (PostWantToGo)
      const rawMarkedWantToGos = await prisma.postWantToGo.findMany({
        where: {
          user_id: targetUserId,
          post: {
            app_type: appType,
            is_mine_only: false,
          },
        },
        include: {
          post: {
            include: {
              user: { select: { id: true, name: true, avatar_url: true } },
              tags: { include: { tag: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      // 自身作成の投稿を整形（赤の他人の場合、「行きたい」投稿の画像を伏せ is_restricted: true を付与）
      const resultPosts = rawPosts.map((post: any) => {
        const isWantToGo = post.status === 'want_to_go';
        const restrictThis = !isInsider && isWantToGo;

        return {
          ...post,
          tags: post.tags.map((pt: any) => pt.tag),
          image_url: restrictThis ? null : post.image_url,
          image_urls: restrictThis ? [] : post.image_urls,
          comment: restrictThis ? null : post.comment,
          is_restricted: restrictThis,
          _visitedCount: post._count?.visiteds ?? 0,
        };
      });

      // 他人の投稿への「行った」を整形（自分が追加した写真・コメント・評価があれば元投稿より優先マージ）
      const markedVisitedPosts = rawMarkedVisiteds
        .filter((v) => v.post && v.post.user_id !== targetUserId)
        .map((v) => {
          const base = v.post;
          const effectiveImageUrl = v.image_url || (v.image_urls && v.image_urls.length > 0 ? v.image_urls[0] : base.image_url);
          const effectiveImageUrls = (v.image_urls && v.image_urls.length > 0) ? v.image_urls : (v.image_url ? [v.image_url] : base.image_urls);
          const effectiveComment = v.comment !== null && v.comment !== undefined && v.comment !== '' ? v.comment : base.comment;
          const effectiveRating = v.rating ?? base.rating;
          const effectiveVisitedAt = v.visited_at ?? base.visited_at;

          return {
            ...base,
            image_url: effectiveImageUrl,
            image_urls: effectiveImageUrls,
            comment: effectiveComment,
            rating: effectiveRating,
            visited_at: effectiveVisitedAt,
            visit_count: v.visit_count,
            tags: base.tags.map((pt: any) => pt.tag),
            visiteds: base.visiteds || [],
            _isMarkedVisited: true,
            _markedVisitedAt: v.created_at,
            _visitedRecordId: v.id,
            is_restricted: false,
          };
        });

      // 他人の投稿への「行きたい」を整形（赤の他人の場合は画像非表示 & is_restricted: true）
      const markedWantToGoPosts = rawMarkedWantToGos
        .filter((w) => w.post && w.post.user_id !== targetUserId)
        .map((w) => {
          const base = w.post;
          const restrictThis = !isInsider;

          return {
            ...base,
            image_url: restrictThis ? null : base.image_url,
            image_urls: restrictThis ? [] : base.image_urls,
            comment: restrictThis ? null : base.comment,
            tags: base.tags.map((pt: any) => pt.tag),
            _isMarkedWantToGo: true,
            _markedWantToGoAt: w.created_at,
            is_restricted: restrictThis,
          };
        });

      // Count friends (accepted only)
      const friendsCount = await prisma.friendship.count({
        where: {
          OR: [
            { user_id: targetUserId },
            { friend_id: targetUserId }
          ],
          status: 'accepted',
        }
      });

      // Count groups
      const groupsCount = await prisma.groupMember.count({
        where: { user_id: targetUserId }
      });

      // Total post count (own visited + own want_to_go + marked)
      const [visitedCount, wantToGoCount, markedVisitedCount, markedWantToGoCount] = await Promise.all([
        prisma.post.count({ where: { user_id: targetUserId, status: 'visited', is_mine_only: false, app_type: appType } }),
        prisma.post.count({ where: { user_id: targetUserId, status: 'want_to_go', is_mine_only: false, app_type: appType } }),
        prisma.postVisited.count({ where: { user_id: targetUserId, post: { is_mine_only: false, app_type: appType } } }),
        prisma.postWantToGo.count({ where: { user_id: targetUserId, post: { is_mine_only: false, app_type: appType } } }),
      ]);
      const totalPostCount = visitedCount + wantToGoCount + markedVisitedCount + markedWantToGoCount;

      // Average rating (Ratings the target user has given)
      const ownRatedPosts = await prisma.post.findMany({
        where: { user_id: targetUserId, rating: { not: null }, is_mine_only: false, app_type: appType },
        select: {
          id: true,
          title: true,
          image_url: true,
          rating: true,
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      });
      const visitedRated = await prisma.postVisited.findMany({
        where: { user_id: targetUserId, rating: { not: null }, post: { app_type: appType } },
        select: {
          rating: true,
          comment: true,
          image_url: true,
          post: {
            select: {
              id: true,
              title: true,
              image_url: true,
              user: { select: { id: true, name: true, avatar_url: true } },
            },
          },
        },
      });

      const allRatings: number[] = [];
      const ratedPosts: any[] = [];

      ownRatedPosts.forEach(p => {
        if (p.rating != null) {
          allRatings.push(p.rating);
          ratedPosts.push({ id: p.id, title: p.title, image_url: p.image_url, rating: p.rating, user: p.user });
        }
      });

      visitedRated.forEach(v => {
        if (v.rating != null && v.post) {
          allRatings.push(v.rating);
          ratedPosts.push({
            id: v.post.id,
            title: v.post.title,
            image_url: v.image_url || v.post.image_url,
            rating: v.rating,
            user: v.post.user,
          });
        }
      });

      const avgRating = allRatings.length > 0
        ? Math.round(allRatings.reduce((a, b) => a + b, 0) / allRatings.length * 10) / 10
        : null;

      // Rating distribution for chart: bins [0-1), [1-2), [2-3), [3-4), [4-5]
      const ratingDistribution = [0, 1, 2, 3, 4].map(bin => ({
        label: `${bin}〜${bin + 1}`,
        min: bin,
        max: bin + 1,
        count: allRatings.filter(r =>
          bin === 4 ? r >= bin && r <= bin + 1 : r >= bin && r < bin + 1
        ).length,
      }));

      // Total likes received on user's posts
      const ownPosts = await prisma.post.findMany({
        where: { user_id: targetUserId, app_type: appType },
        select: { id: true },
      });
      const postIds = ownPosts.map(p => p.id);
      let totalLikesReceived = 0;
      if (postIds.length > 0) {
        const [likes, wants, visiteds] = await Promise.all([
          prisma.postLike.count({ where: { post_id: { in: postIds }, user_id: { not: targetUserId } } }),
          prisma.postWantToGo.count({ where: { post_id: { in: postIds }, user_id: { not: targetUserId } } }),
          prisma.postVisited.count({ where: { post_id: { in: postIds }, user_id: { not: targetUserId } } }),
        ]);
        totalLikesReceived = likes + wants + visiteds;
      }

      return NextResponse.json({
        success: true,
        data: {
          user,
          isInsider,
          relationship,
          posts: resultPosts,
          markedVisitedPosts,
          markedWantToGoPosts,
          friendsCount,
          groupsCount,
          totalPostCount,
          avgRating,
          ratingDistribution,
          totalLikesReceived,
          ratedPosts,
        }
      });
    } catch (e: any) {
      console.error('[GET /api/profiles/[id]] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
