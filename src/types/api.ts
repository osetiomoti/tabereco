/**
 * API共通レスポンス型
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * ページネーション用メタデータ
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface AuthContext {
  userId: string;
  cognitoSub: string;
  email: string;
  groupId: string | null;
  /** Cognito ID token (may be refreshed) — for Identity Pool credential exchange */
  idToken: string | null;
}

