import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/groups/[id]/posts
 * Fetch all posts shared to a specific group.
 * Validates membership before returning data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    // 1. Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: auth.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // 2. Fetch all members of the group
    const members = await prisma.groupMember.findMany({
      where: { group_id: id },
      select: { user_id: true }
    });
    const memberIds = members.map((m: { user_id: string }) => m.user_id);

    // 3. Fetch shared posts from these members (excluding private posts)
    const postsResult = await prisma.post.findMany({
      where: { 
        user_id: { in: memberIds },
        is_mine_only: false
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
      },
      orderBy: {
        visited_at: 'desc',
      },
    });

    // Flatten results
    const posts = postsResult.map((post: any) => ({
      ...post,
      tags: post.tags.map((pt: any) => pt.tag),
      shared_at: post.created_at, // Use created_at as shared_at for compatibility
    }));

    return NextResponse.json({ success: true, data: posts });
  });
}
