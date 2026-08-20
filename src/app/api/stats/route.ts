import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

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
      const { searchParams } = new URL(request.url);
      
      const timelineMode = searchParams.get('timeline_mode') || 'home'; // home, user, group
      const targetUserId = searchParams.get('target_user_id');
      const targetGroupId = searchParams.get('group_id');
      
      const status = searchParams.get('status'); // visited, want_to_go
      const keyword = searchParams.get('keyword');
      const searchMode = searchParams.get('search_mode') || 'store_name'; // store_name, address
      
      const registrantIdsParam = searchParams.get('registrant_ids');
      const groupIdsParam = searchParams.get('group_ids');
      const tagId = searchParams.get('tag_id');
      const selectedTagsParam = searchParams.get('selected_tags');
      const tagMatchMode = searchParams.get('tag_match_mode') || 'AND';
      const ratingMin = searchParams.get('rating_min');
      const ratingMax = searchParams.get('rating_max');
      const ratingUnrated = searchParams.get('rating_unrated') === 'true';
      const prefFilter = searchParams.get('pref'); // 都道府県フィルター
      const isHotSpringMode = searchParams.get('is_hot_spring_mode') === 'true';
      const springTempMin = searchParams.get('spring_temp_min');
      const springTempMax = searchParams.get('spring_temp_max');
      const isSourceFed = searchParams.get('is_source_fed');
      const bathType = searchParams.get('bath_type');
      const stayType = searchParams.get('stay_type');

      // Build Prisma Where Clause
      const where: any = {};

      // 0. App Type Filter (from Cookie)
      const appType = request.cookies.get('app_type')?.value || 'tabereco';
      where.app_type = appType === 'tabireco' ? 'tabireco' : 'tabereco';

      // 1. Base Scope
      if (timelineMode === 'home') {
        const groups = await prisma.groupMember.findMany({ where: { user_id: auth.userId }, select: { group_id: true } });
        const groupIds = groups.map(g => g.group_id);
        const groupMembers = await prisma.groupMember.findMany({ where: { group_id: { in: groupIds } }, select: { user_id: true } });
        const userIds = Array.from(new Set([auth.userId, ...groupMembers.map(gm => gm.user_id)]));

        where.OR = [
          { user_id: auth.userId },
          { user_id: { in: userIds }, is_mine_only: false }
        ];
      } else if (timelineMode === 'user' && targetUserId) {
        if (status === 'visited') {
          where.OR = [
            { user_id: targetUserId, status: 'visited' },
            { visiteds: { some: { user_id: targetUserId } } }
          ];
        } else if (status === 'want_to_go') {
          where.OR = [
            { user_id: targetUserId, status: 'want_to_go' },
            { want_to_gos: { some: { user_id: targetUserId } } }
          ];
        } else if (status === 'liked') {
          where.likes = { some: { user_id: targetUserId } };
        } else {
          where.user_id = targetUserId;
        }
        if (targetUserId !== auth.userId) {
          where.is_mine_only = false;
        }
      } else if (timelineMode === 'group' && targetGroupId) {
        const groupMembers = await prisma.groupMember.findMany({ where: { group_id: targetGroupId }, select: { user_id: true } });
        const userIds = groupMembers.map(gm => gm.user_id);
        where.user_id = { in: userIds };
        where.is_mine_only = false;
      }

      // 2. Filters
      if (status && status !== 'all' && timelineMode !== 'user') {
        where.status = status;
      }

      if (keyword) {
        if (searchMode === 'address') {
          where.address = { contains: keyword, mode: 'insensitive' };
        } else {
          const keywordOR = searchMode === 'all'
            ? [
                { title: { contains: keyword, mode: 'insensitive' } },
                { store_name: { contains: keyword, mode: 'insensitive' } },
                { address: { contains: keyword, mode: 'insensitive' } },
                { comment: { contains: keyword, mode: 'insensitive' } },
              ]
            : [
                { title: { contains: keyword, mode: 'insensitive' } },
                { store_name: { contains: keyword, mode: 'insensitive' } },
                { comment: { contains: keyword, mode: 'insensitive' } },
              ];
          if (where.OR) {
            where.AND = [{ OR: where.OR }, { OR: keywordOR }];
            delete where.OR;
          } else {
            where.OR = keywordOR;
          }
        }
      }

      if (registrantIdsParam) {
        const ids = registrantIdsParam.split(',').filter(Boolean);
        if (ids.length > 0) {
          where.user_id = { in: ids };
        }
      }

      if (groupIdsParam && groupIdsParam !== 'all') {
        const ids = groupIdsParam.split(',').filter(Boolean);
        if (ids.length > 0) {
          const groupMembers = await prisma.groupMember.findMany({ where: { group_id: { in: ids } }, select: { user_id: true } });
          const userIds = groupMembers.map(gm => gm.user_id);
          where.user_id = { in: userIds };
        }
      }

      if (tagId) {
        where.tags = { some: { tag_id: tagId } };
      }

      if (selectedTagsParam) {
        const tags = selectedTagsParam.split(',').filter(Boolean);
        if (tags.length > 0) {
          if (!where.AND) where.AND = [];
          if (tagMatchMode === 'OR') {
            where.AND.push({
              OR: tags.map(tag => ({ tags: { some: { tag: { name: tag } } } }))
            });
          } else {
            tags.forEach(tag => {
              where.AND.push({ tags: { some: { tag: { name: tag } } } });
            });
          }
        }
      }

      // Rating filter
      if (ratingUnrated) {
        where.rating = null;
      } else if (ratingMin != null || ratingMax != null) {
        where.rating = {};
        if (ratingMin != null) where.rating.gte = parseFloat(ratingMin);
        if (ratingMax != null) where.rating.lte = parseFloat(ratingMax);
      }

      // Prefecture filter
      if (prefFilter && prefFilter !== 'その他') {
        if (where.address) {
          // already have address filter (keyword), combine with AND
          if (!where.AND) where.AND = [];
          where.AND.push({ address: { contains: prefFilter, mode: 'insensitive' } });
        } else {
          where.address = { contains: prefFilter, mode: 'insensitive' };
        }
      }

      // Hot spring filters
      if (isHotSpringMode) {
        if (springTempMin || springTempMax) {
          if (!where.AND) where.AND = [];
          const tempConditions: any[] = [];
          if (springTempMin) tempConditions.push({ spring_temp_max: { gte: parseFloat(springTempMin) } });
          if (springTempMax) tempConditions.push({ spring_temp_min: { lte: parseFloat(springTempMax) } });
          if (tempConditions.length > 0) where.AND.push({ AND: tempConditions });
        }
        if (isSourceFed && isSourceFed !== 'all') where.is_source_fed = isSourceFed;
        if (bathType && bathType !== 'all') where.bath_type = bathType;
        if (stayType && stayType !== 'all') where.stay_type = stayType;
      }

      const posts = await prisma.post.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

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
      console.error('[GET /api/stats]', e);
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  });
}
