import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

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

      if (!isSelf) {
        // Check if they are friends
        const isFriend = await prisma.friendship.findFirst({
          where: {
            OR: [
              { user_id: auth.userId, friend_id: targetUserId },
              { user_id: targetUserId, friend_id: auth.userId }
            ]
          }
        });

        // Check if they share any groups
        let shareGroup = false;
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

        if (!isFriend && !shareGroup) {
          return NextResponse.json({ success: false, error: 'Unauthorized to view this profile' }, { status: 403 });
        }
      }

      // Fetch user info
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, avatar_url: true, email: true }
      });

      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      // Fetch user's public/shared posts (is_mine_only = false)
      const posts = await prisma.post.findMany({
        where: {
          user_id: targetUserId,
          is_mine_only: false,
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
        },
        orderBy: {
          visited_at: 'desc',
        },
      });

      // Flatten tags
      const resultPosts = posts.map((post: any) => ({
        ...post,
        tags: post.tags.map((pt: any) => pt.tag),
      }));

      // Count friends
      const friendsCount = await prisma.friendship.count({
        where: {
          OR: [
            { user_id: targetUserId },
            { friend_id: targetUserId }
          ]
        }
      });

      // Count groups
      const groupsCount = await prisma.groupMember.count({
        where: { user_id: targetUserId }
      });

      return NextResponse.json({
        success: true,
        data: {
          user,
          posts: resultPosts,
          friendsCount,
          groupsCount
        }
      });
    } catch (e: any) {
      console.error('[GET /api/profiles/[id]] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
