import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/groups
 * Fetch all groups joined by the current user.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const memberships = await prisma.groupMember.findMany({
        where: { user_id: auth.userId },
        include: {
          group: true,
        },
      });

      const groups = memberships.map((m: any) => ({
        ...m.group,
        member_role: m.role,
      }));

      return NextResponse.json({ success: true, data: groups });
    } catch (e: any) {
      console.error('[GET /api/groups] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * POST /api/groups
 * Create a new group and add the creator as an admin.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { name, description } = await request.json();

      // Simple invite code generation
      const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();

      const group = await prisma.group.create({
        data: {
          name,
          description,
          invite_code,
          created_by: auth.userId,
          members: {
            create: {
              user_id: auth.userId,
              role: 'admin',
            },
          },
        },
      });

      return NextResponse.json({ success: true, data: group });
    } catch (e: any) {
      console.error('[POST /api/groups] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
