import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/posts
 * Fetch posts for the current user with optional filters.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const keyword = searchParams.get('keyword');
      const status = searchParams.get('status');
      const isFavoriteParam = searchParams.get('is_favorite');
      const tagId = searchParams.get('tag_id');
      const markedWantToGo = searchParams.get('marked_want_to_go') === 'true';
      const markedVisited = searchParams.get('marked_visited') === 'true';
      const isMine = searchParams.get('is_mine') === 'true';

      if (markedWantToGo) {
        const wantToGos = await prisma.postWantToGo.findMany({
          where: { user_id: auth.userId },
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

        const result = wantToGos
          .filter((w) => w.post.user_id !== auth.userId)
          .map((w) => ({
            ...w.post,
            tags: w.post.tags.map((pt: any) => pt.tag),
            _markedWantToGoAt: w.created_at,
          }));
        return NextResponse.json({ success: true, data: result });
      }

      if (markedVisited) {
        const visiteds = await prisma.postVisited.findMany({
          where: { user_id: auth.userId },
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

        const result = visiteds
          .filter((v) => v.post.user_id !== auth.userId)
          .map((v) => ({
            ...v.post,
            tags: v.post.tags.map((pt: any) => pt.tag),
            _markedVisitedAt: v.created_at,
            _myRating: v.rating,
          }));
        return NextResponse.json({ success: true, data: result });
      }

      const posts = await prisma.post.findMany({
        where: {
          ...(isMine ? { user_id: auth.userId } : { user_id: auth.userId }),
          ...(status ? { status } : {}),
          ...(isFavoriteParam === 'true' ? { is_favorite: true } : {}),
          ...(keyword ? { title: { contains: keyword, mode: 'insensitive' } } : {}),
          ...(tagId ? { tags: { some: { tag_id: tagId } } } : {}),
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
          want_to_gos: true,
          visiteds: true,
        },
        orderBy: {
          visited_at: 'desc',
        },
      });

      // Flatten tags for easier consumption
      const result = posts.map((post: any) => ({
        ...post,
        tags: post.tags.map((pt: any) => pt.tag),
        _isMarkedWantToGo: post.want_to_gos?.some((w: any) => w.user_id === auth.userId),
      }));

      return NextResponse.json({ success: true, data: result });
    } catch (e: any) {
      console.error('[GET /api/posts] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * POST /api/posts
 * Create a new post.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { title, store_name, comment, rating, image_url, image_urls, visited_at, status, address, google_place_id, latitude, longitude, is_mine_only, price_min, price_max, tagNames } = await request.json();

      const post = await prisma.post.create({
        data: {
          user_id: auth.userId,
          title,
          store_name,
          comment,
          rating,
          image_url,
          image_urls: image_urls || [],
          visited_at: visited_at ? new Date(visited_at) : null,
          status: status || 'visited',
          address,
          google_place_id,
          latitude,
          longitude,
          is_mine_only: is_mine_only || false,
          price_min: price_min ?? null,
          price_max: price_max ?? null,
        },
      });

      // If the post is public, automatically share it to all groups the user belongs to
      if (!is_mine_only) {
        const userGroups = await prisma.groupMember.findMany({
          where: { user_id: auth.userId },
          select: { group_id: true }
        });
        
        if (userGroups.length > 0) {
          await prisma.postGroup.createMany({
            data: userGroups.map(g => ({
              post_id: post.id,
              group_id: g.group_id
            })),
            skipDuplicates: true
          });
        }
      }

      if (tagNames && tagNames.length > 0) {
        // Get initial sort_order offset
        const lastTag = await prisma.tag.findFirst({
          where: { user_id: auth.userId },
          orderBy: { sort_order: 'desc' },
        });
        let nextOrder = lastTag ? lastTag.sort_order + 1 : 0;

        // Sync tags
        const tags = await Promise.all(
          tagNames.map(async (name: string) => {
            const existing = await prisma.tag.findUnique({
              where: { user_id_name: { user_id: auth.userId, name: name.trim() } }
            });
            if (existing) return existing;

            const newTag = await prisma.tag.create({
              data: {
                user_id: auth.userId,
                name: name.trim(),
                sort_order: nextOrder++,
              },
            });
            return newTag;
          })
        );

        await prisma.postTag.createMany({
          data: tags.map((tag) => ({
            post_id: post.id,
            tag_id: tag.id,
          })),
        });
      }

      return NextResponse.json({ success: true, data: post });
    } catch (e: any) {
      console.error('[POST /api/posts] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
