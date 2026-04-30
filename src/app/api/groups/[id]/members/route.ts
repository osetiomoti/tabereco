import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/groups/[id]/members
 * Returns the list of members in a group (only for group members).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      // Verify requester is a member
      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: auth.userId } },
      });
      if (!membership) {
        return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });
      }

      const members = await prisma.groupMember.findMany({
        where: { group_id: id },
        include: {
          user: {
            select: { id: true, name: true, avatar_url: true, email: true },
          },
        },
        orderBy: { joined_at: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: members.map((m: any) => ({
          id: m.user.id,
          name: m.user.name,
          avatar_url: m.user.avatar_url,
          role: m.role,
          joined_at: m.joined_at,
        })),
      });
    } catch (e: any) {
      console.error('[GET /api/groups/[id]/members] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
