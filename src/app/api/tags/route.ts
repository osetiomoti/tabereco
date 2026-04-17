import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/tags
 * Fetch all tags for the current user.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const tags = await prisma.tag.findMany({
      where: {
        user_id: auth.userId,
      },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: tags });
  });
}

/**
 * POST /api/tags
 * Create or update a tag.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { name } = await request.json();
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

      const tag = await prisma.tag.upsert({
        where: {
          user_id_name: {
            user_id: auth.userId,
            name: name.trim(),
          },
        },
        update: {},
        create: {
          user_id: auth.userId,
          name: name.trim(),
        },
      });

      return NextResponse.json({ success: true, data: tag });
    } catch (e: any) {
      console.error('[POST /api/tags] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
