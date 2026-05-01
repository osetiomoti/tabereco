import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * DELETE /api/tags/[id]
 * Delete a specific tag.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      await prisma.tag.delete({
        where: {
          id: id,
          user_id: auth.userId,
        },
      });

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[DELETE /api/tags/[id]] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}

/**
 * PATCH /api/tags/[id]
 * Update a specific tag name.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(request, async (auth) => {
    try {
      const { name } = await request.json();
      const tag = await prisma.tag.update({
        where: {
          id: id,
          user_id: auth.userId,
        },
        data: {
          name: name.trim(),
        },
      });

      return NextResponse.json({ success: true, data: tag });
    } catch (e: any) {
      console.error('[PATCH /api/tags/[id]] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
