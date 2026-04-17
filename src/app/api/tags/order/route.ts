import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * PATCH /api/tags/order
 * Update sort order for multiple tags.
 */
export async function PATCH(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const { tagOrders } = await request.json(); // Array of { id, sort_order }

      if (!Array.isArray(tagOrders)) {
        return NextResponse.json({ success: false, error: 'tagOrders must be an array' }, { status: 400 });
      }

      // Batch update using a transaction
      await prisma.$transaction(
        tagOrders.map((to: { id: string; sort_order: number }) =>
          prisma.tag.update({
            where: { id: to.id, user_id: auth.userId },
            data: { sort_order: to.sort_order },
          })
        )
      );

      return NextResponse.json({ success: true });
    } catch (e: any) {
      console.error('[PATCH /api/tags/order] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
