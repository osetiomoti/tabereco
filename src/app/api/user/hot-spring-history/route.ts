import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/user/hot-spring-history
 * Fetch the user's past unique custom entries for hot spring fields.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const posts = await prisma.post.findMany({
        where: { user_id: auth.userId },
        select: {
          spring_qualities: true,
          bath_types: true,
          source_managements: true,
          stay_types: true,
          facility_types: true,
          shampoo_types: true,
        },
      });

      const uniqueValues = {
        spring_qualities: new Set<string>(),
        bath_types: new Set<string>(),
        source_managements: new Set<string>(),
        stay_types: new Set<string>(),
        facility_types: new Set<string>(),
        shampoo_types: new Set<string>(),
      };

      for (const post of posts) {
        post.spring_qualities.forEach(v => uniqueValues.spring_qualities.add(v));
        post.bath_types.forEach(v => uniqueValues.bath_types.add(v));
        post.source_managements.forEach(v => uniqueValues.source_managements.add(v));
        post.stay_types.forEach(v => uniqueValues.stay_types.add(v));
        post.facility_types.forEach(v => uniqueValues.facility_types.add(v));
        post.shampoo_types.forEach(v => uniqueValues.shampoo_types.add(v));
      }

      return NextResponse.json({
        success: true,
        data: {
          spring_qualities: Array.from(uniqueValues.spring_qualities),
          bath_types: Array.from(uniqueValues.bath_types),
          source_managements: Array.from(uniqueValues.source_managements),
          stay_types: Array.from(uniqueValues.stay_types),
          facility_types: Array.from(uniqueValues.facility_types),
          shampoo_types: Array.from(uniqueValues.shampoo_types),
        }
      });
    } catch (e: any) {
      console.error('[GET /api/user/hot-spring-history] Error:', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
