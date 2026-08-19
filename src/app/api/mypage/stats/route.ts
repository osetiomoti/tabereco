import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

// 47都道府県リスト（長いものを先にマッチングするため降順にソートする必要はないが、一部重複を避けるため順序注意）
const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

// 都道府県名を短縮（「県」「都」「府」「道」を除去）
function normalizePrefecture(pref: string): string {
  return pref.replace(/[都道府県]$/, '');
}

function extractPrefecture(address: string | null): string {
  if (!address) return 'その他';
  for (const pref of PREFECTURES) {
    if (address.includes(pref)) {
      return normalizePrefecture(pref);
    }
  }
  return 'その他';
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const cookieStore = request.cookies;
      const appType = cookieStore.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';

      const urlParams = request.nextUrl.searchParams;
      const status = urlParams.get('status') || 'all';
      const tagsParam = urlParams.get('tags') || '';
      const period = urlParams.get('period') || 'none';
      const isFavorite = urlParams.get('is_favorite') === 'true';
      const ratingMin = parseFloat(urlParams.get('rating_min') || '0');
      const priceMin = parseInt(urlParams.get('price_min') || '0', 10);
      const priceMax = parseInt(urlParams.get('price_max') || '0', 10);

      const filterTags = tagsParam ? tagsParam.split(',') : [];

      // 自分の投稿を全件取得（タグも含む）
      let posts = await prisma.post.findMany({
        where: {
          user_id: auth.userId,
          app_type: appType,
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // 絞り込みの適用
      if (status !== 'all') {
        posts = posts.filter(p => p.status === status);
      }
      if (isFavorite) {
        posts = posts.filter(p => p.is_favorite);
      }
      if (filterTags.length > 0) {
        posts = posts.filter(p => 
          filterTags.every(ft => p.tags.some((pt: any) => pt.tag.name === ft))
        );
      }
      if (ratingMin > 0) {
        posts = posts.filter(p => p.rating != null && p.rating >= ratingMin);
      }
      if (priceMin > 0) {
        posts = posts.filter(p => (p.price_min != null && p.price_min >= priceMin) || (p.price_max != null && p.price_max >= priceMin));
      }
      if (priceMax > 0) {
        posts = posts.filter(p => (p.price_max != null && p.price_max <= priceMax) || (p.price_min != null && p.price_min <= priceMax));
      }
      if (period !== 'none' && period !== 'all') {
        const now = new Date();
        posts = posts.filter(p => {
           if (!p.visited_at) return false;
           const d = new Date(p.visited_at);
           if (period === 'this_month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
           if (period === 'last_3_months') {
             const limit = new Date(now.getFullYear(), now.getMonth() - 2, 1);
             return d >= limit;
           }
           if (period === 'this_year') return d.getFullYear() === now.getFullYear();
           if (period === 'last_year') return d.getFullYear() === now.getFullYear() - 1;
           return true;
        });
      }

      // ─── ① ジャンル割合（タグ集計）───────────────────────
      const tagCountMap: Record<string, number> = {};
      for (const post of posts) {
        for (const pt of post.tags) {
          const name = pt.tag.name;
          tagCountMap[name] = (tagCountMap[name] || 0) + 1;
        }
      }

      const sortedTags = Object.entries(tagCountMap)
        .sort(([, a], [, b]) => b - a);

      const topTags = sortedTags.slice(0, 10);
      const otherTagsCount = sortedTags.slice(10).reduce((sum, [, c]) => sum + c, 0);

      const genreData = topTags.map(([name, count]) => ({ name, count }));
      if (otherTagsCount > 0) {
        genreData.push({ name: 'その他', count: otherTagsCount });
      }

      // ─── ② 月ごとの投稿数 ─────────────────────────────
      const monthlyCountMap: Record<string, { count: number; sortKey: string }> = {};
      let noDateCount = 0;

      for (const post of posts) {
        if (!post.visited_at) {
          noDateCount++;
          continue;
        }
        const d = new Date(post.visited_at);
        const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
        // ソート用に 'YYYY/MM' のキーも持たせる
        const sortKey = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyCountMap[key]) monthlyCountMap[key] = { count: 0, sortKey };
        monthlyCountMap[key].count += 1;
      }

      // 時系列でソート
      const monthlyData = Object.entries(monthlyCountMap)
        .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey))
        .map(([month, data]) => ({ month, count: data.count }));

      // ─── ③ 評価分布 ───────────────────────────────────
      const ratingBuckets: Record<string, number> = {
        '★5': 0,
        '★4': 0,
        '★3': 0,
        '★2': 0,
        '★1': 0,
        '未評価': 0,
      };

      for (const post of posts) {
        if (post.rating == null) {
          ratingBuckets['未評価']++;
        } else {
          const rounded = Math.floor(post.rating);
          const key = `★${Math.min(5, Math.max(1, rounded))}`;
          ratingBuckets[key] = (ratingBuckets[key] || 0) + 1;
        }
      }

      const ratingData = Object.entries(ratingBuckets).map(([label, count]) => ({ label, count }));

      // ─── ④ 都道府県ランキング ──────────────────────────
      const prefCountMap: Record<string, number> = {};

      for (const post of posts) {
        const pref = extractPrefecture(post.address);
        prefCountMap[pref] = (prefCountMap[pref] || 0) + 1;
      }

      const prefData = Object.entries(prefCountMap)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({ name, count }));

      return NextResponse.json({
        success: true,
        data: {
          totalPosts: posts.length,
          genreData,
          monthlyData,
          noDateCount,
          ratingData,
          prefData,
        },
      });
    } catch (e: any) {
      console.error('[GET /api/mypage/stats]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
