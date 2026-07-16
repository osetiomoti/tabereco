import { NextResponse, type NextRequest } from 'next/server';

/** JWTの有効期限を確認（検証なし・期限チェックのみ） */
function isTokenExpiredOrMissing(token: string | undefined): boolean {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    const payload = JSON.parse(atob(padded));
    const exp = payload.exp as number;
    return Date.now() / 1000 > exp - 30; // 30秒のバッファ
  } catch (e) {
    console.error('[proxy] JWT parse error:', e);
    return true;
  }
}

/** Cognitoのリフレッシュトークンで新しいアクセストークンを取得 */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; id_token?: string; expires_in: number } | null> {
  const domain = process.env.COGNITO_DOMAIN || process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;

  if (!domain || !clientId) return null;

  const tokenEndpoint = `https://${domain}/oauth2/token`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (clientSecret) {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  try {
    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Middleware to protect routes using Cognito session cookies.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const devToken = process.env.NODE_ENV !== 'production' ? request.cookies.get('dev_token')?.value : null;

  // Paths that don't require authentication
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/api/auth');
  const isDevPage = pathname.startsWith('/dev') || pathname.startsWith('/api/dev');
  const isSetupPage = pathname.startsWith('/api/setup');
  const isStaticFile = pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|json)$/) || pathname === '/manifest.json';

  // 1. 公開ページや静的ファイルはスルー
  if (isAuthPage || isDevPage || isSetupPage || isStaticFile) {
    // ログイン済みなら /login から /posts へリダイレクト
    if ((accessToken || devToken) && pathname === '/login') {
      return NextResponse.redirect(new URL('/posts', request.url));
    }
    return NextResponse.next();
  }

  // 2. 開発用トークンまたは有効なアクセストークンがあればスルー
  if (devToken || (accessToken && !isTokenExpiredOrMissing(accessToken))) {
    return NextResponse.next();
  }

  // 3. アクセストークンがない/期限切れの場合、リフレッシュを試みる
  if (refreshToken) {
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens?.access_token) {
      const response = NextResponse.next();
      const cookieOptions = (maxAge: number) => ({
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge,
        path: '/',
      });

      response.cookies.set('access_token', newTokens.access_token, cookieOptions(newTokens.expires_in));
      if (newTokens.id_token) {
        response.cookies.set('id_token', newTokens.id_token, cookieOptions(newTokens.expires_in));
      }
      // refresh_token クッキーの有効期限を30日にリセット（ローリングセッション）
      response.cookies.set('refresh_token', refreshToken, cookieOptions(30 * 24 * 60 * 60));
      return response;
    }
  }

  // 4. 未認証ならログインへ
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('redirect', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
