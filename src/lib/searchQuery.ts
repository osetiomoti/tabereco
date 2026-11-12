import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

export interface SearchQueryParams {
  keyword?: string | null;
  searchMode?: 'store_name' | 'address' | null;
  status?: string | null;
  filterMode?: 'group' | 'registrant' | null;
  activeGroups?: string | null; // comma separated or 'all'
  registrantUserIds?: string | null; // comma separated
  tags?: string | null; // comma separated
  tagMatchMode?: 'AND' | 'OR' | null;
  activeMapTag?: string | null;
  isFavorite?: boolean | null;
  period?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  ratingMin?: number | null;
  ratingMax?: number | null;
  ratingUnrated?: boolean | null;
  priceMin?: number | null;
  priceMax?: number | null;
  sortOrder?: string | null;
  // Map bounds
  north?: number | null;
  south?: number | null;
  east?: number | null;
  west?: number | null;
  // Hot spring filters
  isHotSpringMode?: boolean;
  springTempMin?: number | null;
  springTempMax?: number | null;
  isSourceFed?: string | null;
  bathType?: string | null;
  stayType?: string | null;
  springQualities?: string | null;
  bathTypes?: string | null;
  sourceManagements?: string | null;
  stayTypes?: string | null;
  facilityTypes?: string | null;
  shampooTypes?: string | null;
  shampooType?: string | null;
  facilityType?: string | null;
  hiddenSpringRatingMin?: number | null;
  hiddenSpringRatingMax?: number | null;
}

/**
 * リクエストパラメータから SearchQueryParams を抽出
 */
export function parseSearchParams(searchParams: URLSearchParams): SearchQueryParams {
  return {
    keyword: searchParams.get('keyword'),
    searchMode: (searchParams.get('search_mode') as any) || 'store_name',
    status: searchParams.get('status'),
    filterMode: (searchParams.get('filter_mode') as any) || 'group',
    activeGroups: searchParams.get('active_groups'),
    registrantUserIds: searchParams.get('registrant_user_ids'),
    tags: searchParams.get('tags'),
    tagMatchMode: (searchParams.get('tag_match_mode') as any) || 'AND',
    activeMapTag: searchParams.get('active_map_tag'),
    isFavorite: searchParams.get('is_favorite') === 'true',
    period: searchParams.get('period'),
    periodStart: searchParams.get('period_start'),
    periodEnd: searchParams.get('period_end'),
    ratingMin: searchParams.get('rating_min') ? parseFloat(searchParams.get('rating_min')!) : null,
    ratingMax: searchParams.get('rating_max') ? parseFloat(searchParams.get('rating_max')!) : null,
    ratingUnrated: searchParams.get('rating_unrated') === 'true',
    priceMin: searchParams.get('price_min') ? parseInt(searchParams.get('price_min')!, 10) : null,
    priceMax: searchParams.get('price_max') ? parseInt(searchParams.get('price_max')!, 10) : null,
    sortOrder: searchParams.get('sort_order') || 'created_desc',
    north: searchParams.get('north') ? parseFloat(searchParams.get('north')!) : null,
    south: searchParams.get('south') ? parseFloat(searchParams.get('south')!) : null,
    east: searchParams.get('east') ? parseFloat(searchParams.get('east')!) : null,
    west: searchParams.get('west') ? parseFloat(searchParams.get('west')!) : null,
    // 温泉
    isHotSpringMode: searchParams.get('is_hot_spring_mode') === 'true',
    springTempMin: searchParams.get('spring_temp_min') ? parseFloat(searchParams.get('spring_temp_min')!) : null,
    springTempMax: searchParams.get('spring_temp_max') ? parseFloat(searchParams.get('spring_temp_max')!) : null,
    isSourceFed: searchParams.get('is_source_fed'),
    bathType: searchParams.get('bath_type'),
    stayType: searchParams.get('stay_type'),
    springQualities: searchParams.get('spring_qualities'),
    bathTypes: searchParams.get('bath_types'),
    sourceManagements: searchParams.get('source_managements'),
    stayTypes: searchParams.get('stay_types'),
    facilityTypes: searchParams.get('facility_types'),
    shampooTypes: searchParams.get('shampoo_types'),
    shampooType: searchParams.get('shampoo_type'),
    facilityType: searchParams.get('facility_type'),
    hiddenSpringRatingMin: searchParams.get('hidden_spring_rating_min') ? parseInt(searchParams.get('hidden_spring_rating_min')!, 10) : null,
    hiddenSpringRatingMax: searchParams.get('hidden_spring_rating_max') ? parseInt(searchParams.get('hidden_spring_rating_max')!, 10) : null,
  };
}

/**
 * Prisma の Where 句を構築
 */
export async function buildSearchWhereClause(
  params: SearchQueryParams,
  userId: string,
  appType: string
): Promise<Prisma.PostWhereInput> {
  const where: Prisma.PostWhereInput = {
    app_type: appType === 'tabireco' ? 'tabireco' : 'tabereco',
  };

  const andConditions: Prisma.PostWhereInput[] = [];

  // 1. 権限スコープ / グループ / 投稿者
  // ユーザーが所属する全グループを取得
  const userGroups = await prisma.groupMember.findMany({
    where: { user_id: userId },
    select: { group_id: true },
  });
  const joinedGroupIds = userGroups.map((g) => g.group_id);

  if (params.filterMode === 'group') {
    // グループモード
    const activeGroupList = params.activeGroups
      ? params.activeGroups.split(',').filter(Boolean)
      : ['all'];

    if (activeGroupList.includes('all')) {
      // 所属する全グループのメンバーによる投稿（公開のみ）+ 自分の投稿
      const allMembers = await prisma.groupMember.findMany({
        where: { group_id: { in: joinedGroupIds } },
        select: { user_id: true },
      });
      const memberUserIds = Array.from(new Set(allMembers.map((m) => m.user_id)));

      andConditions.push({
        OR: [
          { user_id: userId },
          {
            user_id: { in: memberUserIds },
            is_mine_only: false,
          },
        ],
      });
    } else if (activeGroupList.length > 0) {
      // 特定のグループに限定
      const validGroupIds = activeGroupList.filter((gid) => joinedGroupIds.includes(gid));
      const groupMembers = await prisma.groupMember.findMany({
        where: { group_id: { in: validGroupIds } },
        select: { user_id: true },
      });
      const targetUserIds = Array.from(new Set(groupMembers.map((m) => m.user_id)));

      andConditions.push({
        user_id: { in: targetUserIds },
        is_mine_only: false,
      });
    } else {
      // 該当なし
      andConditions.push({ user_id: userId });
    }
  } else {
    // 投稿者（registrant）モード
    const registrantIds = params.registrantUserIds
      ? params.registrantUserIds.split(',').filter(Boolean)
      : [];

    if (registrantIds.length > 0) {
      const isMeIncluded = registrantIds.includes(userId);
      const otherIds = registrantIds.filter((id) => id !== userId);

      if (isMeIncluded && otherIds.length > 0) {
        andConditions.push({
          OR: [
            { user_id: userId },
            { user_id: { in: otherIds }, is_mine_only: false },
          ],
        });
      } else if (isMeIncluded) {
        andConditions.push({ user_id: userId });
      } else {
        andConditions.push({
          user_id: { in: otherIds },
          is_mine_only: false,
        });
      }
    } else {
      // 投稿者指定なし → 自分の投稿 + 所属グループの公開投稿すべて
      const allMembers = await prisma.groupMember.findMany({
        where: { group_id: { in: joinedGroupIds } },
        select: { user_id: true },
      });
      const memberUserIds = Array.from(new Set(allMembers.map((m) => m.user_id)));

      andConditions.push({
        OR: [
          { user_id: userId },
          {
            user_id: { in: memberUserIds },
            is_mine_only: false,
          },
        ],
      });
    }
  }

  // 2. ステータス (visited, want_to_go)
  if (params.status && params.status !== 'all') {
    andConditions.push({ status: params.status });
  }

  // 3. キーワード検索
  if (params.keyword && params.keyword.trim()) {
    const kw = params.keyword.trim();
    if (params.searchMode === 'address') {
      andConditions.push({
        address: { contains: kw, mode: 'insensitive' },
      });
    } else {
      // store_name mode: title または store_name
      andConditions.push({
        OR: [
          { title: { contains: kw, mode: 'insensitive' } },
          { store_name: { contains: kw, mode: 'insensitive' } },
        ],
      });
    }
  }

  // 4. タグ検索
  const tagList = params.tags ? params.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  if (tagList.length > 0) {
    if (params.tagMatchMode === 'OR') {
      andConditions.push({
        OR: tagList.map((tag) => ({
          tags: { some: { tag: { name: tag } } },
        })),
      });
    } else {
      tagList.forEach((tag) => {
        andConditions.push({
          tags: { some: { tag: { name: tag } } },
        });
      });
    }
  }

  // 5. activeMapTag
  if (params.activeMapTag && params.activeMapTag.trim()) {
    andConditions.push({
      tags: { some: { tag: { name: params.activeMapTag.trim() } } },
    });
  }

  // 6. お気に入り
  if (params.isFavorite) {
    andConditions.push({ is_favorite: true });
  }

  // 7. 期間
  if (params.period && params.period !== 'none' && params.period !== 'all') {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (params.period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (params.period === 'last_3_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      endDate = now;
    } else if (params.period === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (params.period === 'last_year') {
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (params.period === 'custom') {
      if (params.periodStart) startDate = new Date(params.periodStart);
      if (params.periodEnd) {
        endDate = new Date(params.periodEnd);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeNullableFilter = {};
      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;
      andConditions.push({ visited_at: dateFilter });
    }
  }

  // 8. 評価
  if (params.ratingUnrated) {
    andConditions.push({ rating: null });
  } else if (params.ratingMin != null || params.ratingMax != null) {
    const ratingFilter: Prisma.FloatNullableFilter = {};
    if (params.ratingMin != null) ratingFilter.gte = params.ratingMin;
    if (params.ratingMax != null) ratingFilter.lte = params.ratingMax;
    andConditions.push({ rating: ratingFilter });
  }

  // 9. 価格
  if (params.priceMin != null) {
    andConditions.push({ price_min: { gte: params.priceMin } });
  }
  if (params.priceMax != null) {
    andConditions.push({
      price_min: { not: null, lte: params.priceMax },
    });
  }

  // 10. 地図の表示範囲（Bounds）
  if (
    params.north != null &&
    params.south != null &&
    params.east != null &&
    params.west != null
  ) {
    andConditions.push({
      latitude: {
        gte: Math.min(params.south, params.north),
        lte: Math.max(params.south, params.north),
      },
      longitude: {
        gte: Math.min(params.west, params.east),
        lte: Math.max(params.west, params.east),
      },
    });
  }

  // 11. 温泉フィルター
  if (params.isHotSpringMode) {
    if (params.springTempMin != null || params.springTempMax != null) {
      const tempConditions: Prisma.PostWhereInput[] = [];
      if (params.springTempMin != null) {
        tempConditions.push({ spring_temp_max: { gte: params.springTempMin } });
      }
      if (params.springTempMax != null) {
        tempConditions.push({ spring_temp_min: { lte: params.springTempMax } });
      }
      if (tempConditions.length > 0) {
        andConditions.push({ AND: tempConditions });
      }
    }

    if (params.isSourceFed && params.isSourceFed !== 'all') {
      andConditions.push({
        OR: [
          { is_source_fed: params.isSourceFed },
          { source_managements: { has: params.isSourceFed } },
        ],
      });
    }

    if (params.bathType && params.bathType !== 'all') {
      andConditions.push({
        OR: [
          { bath_type: params.bathType },
          { bath_types: { has: params.bathType } },
        ],
      });
    }

    if (params.stayType && params.stayType !== 'all') {
      andConditions.push({
        OR: [
          { stay_type: params.stayType },
          { stay_types: { has: params.stayType } },
        ],
      });
    }

    if (params.springQualities) {
      const arr = params.springQualities.split(',').filter(Boolean);
      if (arr.length > 0) {
        andConditions.push({
          OR: [
            { spring_qualities: { hasSome: arr } },
            { spring_quality: { in: arr } },
          ],
        });
      }
    }

    if (params.bathTypes) {
      const arr = params.bathTypes.split(',').filter(Boolean);
      if (arr.length > 0) {
        andConditions.push({
          OR: [
            { bath_types: { hasSome: arr } },
            { bath_type: { in: arr } },
          ],
        });
      }
    }

    if (params.sourceManagements) {
      const arr = params.sourceManagements.split(',').filter(Boolean);
      if (arr.length > 0) {
        andConditions.push({
          OR: [
            { source_managements: { hasSome: arr } },
            { is_source_fed: { in: arr } },
          ],
        });
      }
    }

    if (params.shampooType) {
      andConditions.push({
        OR: [
          { shampoo_type: params.shampooType },
          { shampoo_types: { has: params.shampooType } },
        ],
      });
    }

    if (params.facilityType) {
      andConditions.push({
        OR: [
          { facility_type: params.facilityType },
          { facility_types: { has: params.facilityType } },
        ],
      });
    }

    if (params.stayTypes) {
      const arr = params.stayTypes.split(',').filter(Boolean);
      if (arr.length > 0) {
        andConditions.push({
          OR: [
            { stay_types: { hasSome: arr } },
            { stay_type: { in: arr } },
          ],
        });
      }
    }

    if (params.facilityTypes) {
      const arr = params.facilityTypes.split(',').filter(Boolean);
      if (arr.length > 0) {
        andConditions.push({
          OR: [
            { facility_types: { hasSome: arr } },
            { facility_type: { in: arr } },
          ],
        });
      }
    }

    if (params.shampooTypes) {
      const arr = params.shampooTypes.split(',').filter(Boolean);
      if (arr.length > 0) {
        andConditions.push({
          OR: [
            { shampoo_types: { hasSome: arr } },
            { shampoo_type: { in: arr } },
          ],
        });
      }
    }

    if (params.hiddenSpringRatingMin != null || params.hiddenSpringRatingMax != null) {
      const hFilter: Prisma.IntNullableFilter = {};
      if (params.hiddenSpringRatingMin != null) hFilter.gte = params.hiddenSpringRatingMin;
      if (params.hiddenSpringRatingMax != null) hFilter.lte = params.hiddenSpringRatingMax;
      andConditions.push({ hidden_spring_rating: hFilter });
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

/**
 * ソート順を構築（IDを第2ソートに設定して順序を安定化）
 */
export function buildSearchOrderBy(sortOrder?: string | null): Prisma.PostOrderByWithRelationInput[] {
  switch (sortOrder) {
    case 'rating_desc':
      return [
        { rating: { sort: 'desc', nulls: 'last' } },
        { created_at: 'desc' },
        { id: 'desc' },
      ];
    case 'rating_asc':
      return [
        { rating: { sort: 'asc', nulls: 'last' } },
        { created_at: 'desc' },
        { id: 'desc' },
      ];
    case 'price_desc':
      return [
        { price_max: { sort: 'desc', nulls: 'last' } },
        { created_at: 'desc' },
        { id: 'desc' },
      ];
    case 'price_asc':
      return [
        { price_min: { sort: 'asc', nulls: 'last' } },
        { created_at: 'desc' },
        { id: 'desc' },
      ];
    case 'created_desc':
    default:
      return [
        { created_at: 'desc' },
        { id: 'desc' },
      ];
  }
}

/**
 * クライアントの FilterState から URLSearchParams を構築するヘルパー
 */
export function appendFilterSearchParams(params: URLSearchParams, filterState: any): void {
  const { activeTab, keyword, searchMode, activeGroups, advancedFilters, activeMapTag, filterMode } = filterState;

  if (activeTab && activeTab !== 'all') params.append('status', activeTab);
  if (keyword && keyword.trim()) params.append('keyword', keyword.trim());
  if (searchMode) params.append('search_mode', searchMode);

  const mode = filterMode || advancedFilters?.filterMode || 'group';
  params.append('filter_mode', mode);

  if (mode === 'group') {
    if (activeGroups && activeGroups.length > 0) {
      params.append('active_groups', activeGroups.join(','));
    }
  } else {
    const regIds = advancedFilters?.registrantUserIds;
    if (regIds && regIds.length > 0) {
      params.append('registrant_user_ids', regIds.join(','));
    }
  }

  if (activeMapTag) {
    params.append('active_map_tag', activeMapTag);
  }

  if (advancedFilters) {
    if (advancedFilters.tags && advancedFilters.tags.length > 0) {
      params.append('tags', advancedFilters.tags.join(','));
      if (advancedFilters.tagMatchMode) {
        params.append('tag_match_mode', advancedFilters.tagMatchMode);
      }
    }
    if (advancedFilters.is_favorite) {
      params.append('is_favorite', 'true');
    }
    if (advancedFilters.period && advancedFilters.period !== 'none') {
      params.append('period', advancedFilters.period);
      if (advancedFilters.period_start) params.append('period_start', advancedFilters.period_start);
      if (advancedFilters.period_end) params.append('period_end', advancedFilters.period_end);
    }
    if (advancedFilters.rating_unrated) {
      params.append('rating_unrated', 'true');
    } else {
      if (advancedFilters.rating_min != null) params.append('rating_min', String(advancedFilters.rating_min));
      if (advancedFilters.rating_max != null) params.append('rating_max', String(advancedFilters.rating_max));
    }
    if (advancedFilters.price_min != null) params.append('price_min', String(advancedFilters.price_min));
    if (advancedFilters.price_max != null) params.append('price_max', String(advancedFilters.price_max));
    if (advancedFilters.sort_order) params.append('sort_order', advancedFilters.sort_order);

    // 温泉フィルター
    if (advancedFilters.is_hot_spring_mode) {
      params.append('is_hot_spring_mode', 'true');
      if (advancedFilters.spring_temp_min != null) params.append('spring_temp_min', String(advancedFilters.spring_temp_min));
      if (advancedFilters.spring_temp_max != null) params.append('spring_temp_max', String(advancedFilters.spring_temp_max));
      if (advancedFilters.is_source_fed) params.append('is_source_fed', advancedFilters.is_source_fed);
      if (advancedFilters.bath_type) params.append('bath_type', advancedFilters.bath_type);
      if (advancedFilters.stay_type) params.append('stay_type', advancedFilters.stay_type);
      if (advancedFilters.spring_qualities?.length > 0) params.append('spring_qualities', advancedFilters.spring_qualities.join(','));
      if (advancedFilters.bath_types?.length > 0) params.append('bath_types', advancedFilters.bath_types.join(','));
      if (advancedFilters.source_managements?.length > 0) params.append('source_managements', advancedFilters.source_managements.join(','));
      if (advancedFilters.stay_types?.length > 0) params.append('stay_types', advancedFilters.stay_types.join(','));
      if (advancedFilters.facility_types?.length > 0) params.append('facility_types', advancedFilters.facility_types.join(','));
      if (advancedFilters.shampoo_types?.length > 0) params.append('shampoo_types', advancedFilters.shampoo_types.join(','));
      if (advancedFilters.shampoo_type) params.append('shampoo_type', advancedFilters.shampoo_type);
      if (advancedFilters.facility_type) params.append('facility_type', advancedFilters.facility_type);
      if (advancedFilters.hidden_spring_rating_min != null) params.append('hidden_spring_rating_min', String(advancedFilters.hidden_spring_rating_min));
      if (advancedFilters.hidden_spring_rating_max != null) params.append('hidden_spring_rating_max', String(advancedFilters.hidden_spring_rating_max));
    }
  }
}
