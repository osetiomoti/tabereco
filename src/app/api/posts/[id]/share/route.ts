import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * POST /api/posts/[id]/share
 * Update group sharing for a specific post.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      const { groupIds } = await request.json();

      if (!Array.isArray(groupIds)) {
        return NextResponse.json({ success: false, error: 'groupIds must be an array' }, { status: 400 });
      }

      // 1. Verify post ownership
      const post = await prisma.post.findUnique({
        where: { id: id, user_id: auth.userId },
      });

      if (!post) {
        return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
      }

      // 2. Clear old shares
      await prisma.postGroup.deleteMany({
        where: { post_id: id },
      });

      // 3. Add new shares (if user is member of those groups)
      if (groupIds.length > 0) {
        // Filter groups where the user is a member
        const memberships = await prisma.groupMember.findMany({
          where: {
            user_id: auth.userId,
            group_id: { in: groupIds },
          },
          select: { group_id: true },
        });

        const validGroupIds = memberships.map((m: any) => m.group_id);

        await prisma.postGroup.createMany({
          data: validGroupIds.map((gid: string) => ({
            post_id: id,
            group_id: gid,
          })),
        });
      }

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[POST /api/posts/[id]/share] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
