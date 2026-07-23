import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/refresh
 * Proactively refreshes the access token using the refresh token cookie.
 * Called periodically by the client to keep the session alive.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ success: false, error: 'No refresh token' }, { status: 401 });
  }

  const domain = process.env.COGNITO_DOMAIN || process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;

  if (!domain || !clientId) {
    return NextResponse.json({ success: false, error: 'Cognito configuration missing' }, { status: 500 });
  }

  try {
    const tokenEndpoint = `https://${domain}/oauth2/token`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (clientSecret) {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Auth Refresh] Token refresh failed:', errorText);
      return NextResponse.json({ success: false, error: 'Refresh failed' }, { status: 401 });
    }

    const tokens = await res.json();

    const response = NextResponse.json({ success: true });

    const cookieOptions = (maxAge: number) => ({
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge,
      expires: new Date(Date.now() + maxAge * 1000),
      path: '/',
    });

    if (tokens.access_token) {
      response.cookies.set('access_token', tokens.access_token, cookieOptions(tokens.expires_in || 3600));
    }
    if (tokens.id_token) {
      response.cookies.set('id_token', tokens.id_token, cookieOptions(tokens.expires_in || 3600));
    }
    // Refresh token rotationが無効な場合、元のrefresh_tokenを使い続けるので期限を延長
    response.cookies.set('refresh_token', refreshToken, cookieOptions(30 * 24 * 60 * 60));

    return response;
  } catch (error) {
    console.error('[Auth Refresh] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
