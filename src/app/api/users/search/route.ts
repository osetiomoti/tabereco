import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/users/search?q=<user_id_prefix_or_name>
 * ユーザーを検索（IDまたは名前の前方一致）
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const q = request.nextUrl.searchParams.get('q')?.trim();
      if (!q || q.length < 3) {
        return NextResponse.json({ success: false, error: '3文字以上入力してください' }, { status: 400 });
      }

      // UUID型はstartsWith不可。IDは完全一致、名前は部分一致で検索
      const users = await prisma.user.findMany({
        where: {
          id: { not: auth.userId },
          OR: [
            { id: { equals: q } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, avatar_url: true },
        take: 10,
      });

      return NextResponse.json({ success: true, data: users });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
