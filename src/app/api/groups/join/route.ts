import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * POST /api/groups/join
 * Join a group using an invite code.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { inviteCode } = await request.json();
      if (!inviteCode) {
        return NextResponse.json({ success: false, error: 'Invite code is required' }, { status: 400 });
      }

      const group = await prisma.group.findUnique({
        where: { invite_code: inviteCode.trim().toUpperCase() },
      });

      if (!group) {
        return NextResponse.json({ success: false, error: 'Invalid invite code' }, { status: 404 });
      }

      // Check if already a member
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: group.id,
            user_id: auth.userId,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json({ success: true, data: group });
      }

      // Join group
      await prisma.groupMember.create({
        data: {
          group_id: group.id,
          user_id: auth.userId,
          role: 'member',
        },
      });

      return NextResponse.json({ success: true, data: group });
    } catch (e: any) {
      console.error('[POST /api/groups/join] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
