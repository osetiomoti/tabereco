import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/timeline
 * Fetches paginated posts with advanced server-side filtering.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { searchParams } = new URL(request.url);
      
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const cursor = searchParams.get('cursor');
      
      const timelineMode = searchParams.get('timeline_mode') || 'home'; // home, user, group
      const targetUserId = searchParams.get('target_user_id');
      const targetGroupId = searchParams.get('group_id');
      
      const status = searchParams.get('status'); // visited, want_to_go
      const keyword = searchParams.get('keyword');
      const searchMode = searchParams.get('search_mode') || 'store_name'; // store_name, address
      
      const registrantIdsParam = searchParams.get('registrant_ids');
      const groupIdsParam = searchParams.get('group_ids');
      const tagId = searchParams.get('tag_id');
      const selectedTagsParam = searchParams.get('selected_tags');
      const tagMatchMode = searchParams.get('tag_match_mode') || 'AND';
      const sortField = searchParams.get('sort_field') || 'date';
      const sortOrder = searchParams.get('sort_order') || 'desc';

      // Build Prisma Where Clause
      const where: any = {};

      // 0. App Type Filter (from Cookie)
      const appType = request.cookies.get('app_type')?.value || 'tabereco';
      where.app_type = appType === 'tabireco' ? 'tabireco' : 'tabereco';

      // 1. Base Scope
      if (timelineMode === 'home') {
        // Own posts + group posts
        const groups = await prisma.groupMember.findMany({ where: { user_id: auth.userId }, select: { group_id: true } });
        const groupIds = groups.map(g => g.group_id);
        const groupMembers = await prisma.groupMember.findMany({ where: { group_id: { in: groupIds } }, select: { user_id: true } });
        const userIds = Array.from(new Set([auth.userId, ...groupMembers.map(gm => gm.user_id)]));

        where.OR = [
          { user_id: auth.userId },
          { user_id: { in: userIds }, is_mine_only: false }
        ];
      } else if (timelineMode === 'user' && targetUserId) {
        if (status === 'visited') {
          where.OR = [
            { user_id: targetUserId, status: 'visited' },
            { visiteds: { some: { user_id: targetUserId } } }
          ];
        } else if (status === 'want_to_go') {
          where.OR = [
            { user_id: targetUserId, status: 'want_to_go' },
            { want_to_gos: { some: { user_id: targetUserId } } }
          ];
        } else if (status === 'liked') {
          where.likes = { some: { user_id: targetUserId } };
        } else {
          where.user_id = targetUserId;
        }

        if (targetUserId !== auth.userId) {
          where.is_mine_only = false;
        }
      } else if (timelineMode === 'group' && targetGroupId) {
        const groupMembers = await prisma.groupMember.findMany({ where: { group_id: targetGroupId }, select: { user_id: true } });
        const userIds = groupMembers.map(gm => gm.user_id);
        where.user_id = { in: userIds };
        where.is_mine_only = false;
      }

      // 2. Filters
      if (status && status !== 'all' && timelineMode !== 'user') {
        where.status = status;
      }

      if (keyword) {
        if (searchMode === 'address') {
          where.address = { contains: keyword, mode: 'insensitive' };
        } else {
          const keywordOR = searchMode === 'all'
            ? [
                { title: { contains: keyword, mode: 'insensitive' } },
                { store_name: { contains: keyword, mode: 'insensitive' } },
                { address: { contains: keyword, mode: 'insensitive' } },
                { comment: { contains: keyword, mode: 'insensitive' } },
              ]
            : [
                { title: { contains: keyword, mode: 'insensitive' } },
                { store_name: { contains: keyword, mode: 'insensitive' } },
                { comment: { contains: keyword, mode: 'insensitive' } },
              ];
          if (where.OR) {
            where.AND = [{ OR: where.OR }, { OR: keywordOR }];
            delete where.OR;
          } else {
            where.OR = keywordOR;
          }
        }
      }

      const ratingMin = searchParams.get('rating_min');
      const ratingMax = searchParams.get('rating_max');
      const ratingUnrated = searchParams.get('rating_unrated') === 'true';

      if (ratingUnrated) {
        where.rating = null;
      } else if (ratingMin != null || ratingMax != null) {
        where.rating = {};
        if (ratingMin != null) where.rating.gte = parseFloat(ratingMin);
        if (ratingMax != null) where.rating.lte = parseFloat(ratingMax);
      }

      // Hot Spring filters
      const isHotSpringMode = searchParams.get('is_hot_spring_mode') === 'true';
      if (isHotSpringMode) {
        const springTempMin = searchParams.get('spring_temp_min');
        const springTempMax = searchParams.get('spring_temp_max');
        const isSourceFed = searchParams.get('is_source_fed');
        const bathType = searchParams.get('bath_type');
        const stayType = searchParams.get('stay_type');
        // V2 Array fields (comma separated)
        const springQualities = searchParams.get('spring_qualities');
        const bathTypes = searchParams.get('bath_types');
        const sourceMgmts = searchParams.get('source_managements');
        // V2 String fields
        const shampooType = searchParams.get('shampoo_type');
        const facilityType = searchParams.get('facility_type');

        // V3 Array fields
        const stayTypes = searchParams.get('stay_types');
        const facilityTypes = searchParams.get('facility_types');
        const shampooTypes = searchParams.get('shampoo_types');

        if (springTempMin || springTempMax) {
          if (!where.AND) where.AND = [];
          
          const tempConditions: any[] = [];
          if (springTempMin) tempConditions.push({ spring_temp_max: { gte: parseFloat(springTempMin) } });
          if (springTempMax) tempConditions.push({ spring_temp_min: { lte: parseFloat(springTempMax) } });
          
          if (tempConditions.length > 0) {
            where.AND.push({ AND: tempConditions });
          }
        }

        if (isSourceFed && isSourceFed !== 'all') where.is_source_fed = isSourceFed;
        if (bathType && bathType !== 'all') where.bath_type = bathType;
        if (stayType && stayType !== 'all') where.stay_type = stayType;

        if (springQualities) where.spring_qualities = { hasSome: springQualities.split(',').filter(Boolean) };
        if (bathTypes) where.bath_types = { hasSome: bathTypes.split(',').filter(Boolean) };
        if (sourceMgmts) where.source_managements = { hasSome: sourceMgmts.split(',').filter(Boolean) };
        if (shampooType) where.shampoo_type = shampooType;
        if (facilityType) where.facility_type = facilityType;
        
        if (stayTypes) where.stay_types = { hasSome: stayTypes.split(',').filter(Boolean) };
        if (facilityTypes) where.facility_types = { hasSome: facilityTypes.split(',').filter(Boolean) };
        if (shampooTypes) where.shampoo_types = { hasSome: shampooTypes.split(',').filter(Boolean) };
      }

      if (registrantIdsParam) {
        const ids = registrantIdsParam.split(',').filter(Boolean);
        if (ids.length > 0) {
          where.user_id = { in: ids };
        }
      }

      if (groupIdsParam && groupIdsParam !== 'all') {
        const ids = groupIdsParam.split(',').filter(Boolean);
        if (ids.length > 0) {
          const groupMembers = await prisma.groupMember.findMany({ where: { group_id: { in: ids } }, select: { user_id: true } });
          const userIds = groupMembers.map(gm => gm.user_id);
          where.user_id = { in: userIds };
        }
      }

      if (tagId) {
        where.tags = { some: { tag_id: tagId } };
      }

      if (selectedTagsParam) {
        const tags = selectedTagsParam.split(',').filter(Boolean);
        if (tags.length > 0) {
          if (!where.AND) where.AND = [];
          if (tagMatchMode === 'OR') {
            where.AND.push({
              OR: tags.map(tag => ({ tags: { some: { tag: { name: tag } } } }))
            });
          } else {
            tags.forEach(tag => {
              where.AND.push({ tags: { some: { tag: { name: tag } } } });
            });
          }
        }
      }

      // Build OrderBy Clause
      const sortOption = sortOrder === 'created_desc' || sortField === 'created_at' || sortOrder === 'desc' ? (sortField === 'visited_at' || sortOrder === 'visited_desc' ? 'visited_desc' : sortField === 'rating' ? 'rating_desc' : 'created_desc') : sortOrder;

      let orderBy: any[];
      if (sortOption === 'visited_desc' || sortField === 'visited_at') {
        orderBy = [
          { visited_at: { sort: 'desc', nulls: 'last' } },
          { created_at: 'desc' },
          { id: 'desc' },
        ];
      } else if (sortOption === 'rating_desc' || (sortField === 'rating' && sortOrder === 'desc')) {
        orderBy = [
          { rating: 'desc' },
          { created_at: 'desc' },
          { id: 'desc' },
        ];
      } else if (sortOption === 'rating_asc' || (sortField === 'rating' && sortOrder === 'asc')) {
        orderBy = [
          { rating: 'asc' },
          { created_at: 'desc' },
          { id: 'desc' },
        ];
      } else if (sortOption === 'price_desc') {
        orderBy = [
          { price_max: 'desc' },
          { created_at: 'desc' },
          { id: 'desc' },
        ];
      } else if (sortOption === 'price_asc') {
        orderBy = [
          { price_min: 'asc' },
          { created_at: 'desc' },
          { id: 'desc' },
        ];
      } else {
        // Default: 投稿日時順 (created_at desc)
        orderBy = [
          { created_at: 'desc' },
          { id: 'desc' },
        ];
      }

      // Query Prisma
      const posts = await prisma.post.findMany({
        where,
        take: limit + 1, // Fetch 1 extra to determine if there is a next page
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy,
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
          tags: { include: { tag: true } },
          want_to_gos: { select: { user_id: true } },
          visiteds: { select: { user_id: true, rating: true } },
          likes: { select: { user_id: true } },
          _count: { select: { comments: true, likes: true } }
        }
      });

      let nextCursor = null;
      if (posts.length > limit) {
        const nextItem = posts.pop(); // Remove the extra item
        nextCursor = nextItem?.id || null;
      }

      // Format result
      const result = posts.map((post: any) => {
        const allRatings = post.visiteds.filter((v: any) => v.rating != null).map((v: any) => v.rating);
        if (post.rating != null && post.rating > 0) allRatings.push(post.rating);
        const rawAvg = allRatings.length > 0 ? allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length : null;
        const avgRating = rawAvg !== null ? Math.round(rawAvg * 10) / 10 : null;

        const myVisitedEntry = post.visiteds?.find((v: any) => v.user_id === auth.userId);
        const myRatingVal = post.user_id === auth.userId ? post.rating : (myVisitedEntry?.rating ?? null);

        return {
          ...post,
          tags: post.tags.map((pt: any) => pt.tag),
          _isMarkedWantToGo: post.want_to_gos?.some((w: any) => w.user_id === auth.userId),
          _isMarkedVisited: post.visiteds?.some((v: any) => v.user_id === auth.userId),
          _isLikedByMe: post.likes?.some((l: any) => l.user_id === auth.userId),
          _myRating: myRatingVal,
          _comment_count: post._count?.comments ?? 0,
          _like_count: post._count?.likes ?? 0,
          _avgRating: avgRating,
          _ratingCount: allRatings.length,
          __is_mine: post.user_id === auth.userId
        };
      });

      return NextResponse.json({
        success: true,
        data: result,
        pagination: {
          nextCursor,
          hasMore: nextCursor !== null
        }
      });

    } catch (e: any) {
      console.error('[GET /api/timeline] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
