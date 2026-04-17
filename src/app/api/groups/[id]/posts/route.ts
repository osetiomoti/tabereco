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

    // 2. Fetch shared posts (excluding private posts)
    const sharedPosts = await prisma.postGroup.findMany({
      where: { 
        group_id: id,
        post: {
          is_mine_only: false
        }
      },
      include: {
        post: {
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
        },
      },
      orderBy: {
        shared_at: 'desc',
      },
    });

    // Flatten results
    const posts = sharedPosts.map((sp: any) => ({
      ...sp.post,
      tags: sp.post.tags.map((pt: any) => pt.tag),
      shared_at: sp.shared_at,
    }));

    return NextResponse.json({ success: true, data: posts });
  });
}
