import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/refresh
 * Refreshes the access token.
 * Accepts refresh token from either:
 * - httpOnly cookie (normal case)
 * - Request body { refresh_token: string } (iOS PWA fallback when cookies were cleared)
 */
export async function POST(request: NextRequest) {
  // Try to get refresh token from cookie first, then fall back to request body
  let refreshToken = request.cookies.get('refresh_token')?.value;
  let fromBody = false;

  if (!refreshToken) {
    try {
      const body = await request.json().catch(() => null);
      if (body?.refresh_token) {
        refreshToken = body.refresh_token;
        fromBody = true;
      }
    } catch {}
  }

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

    const cookieOptions = (maxAge: number) => ({
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge,
      expires: new Date(Date.now() + maxAge * 1000),
      path: '/',
    });

    // When called from body (iOS PWA cookie recovery), return the refresh token
    // in the response body so the client can update localStorage
    const responseBody: Record<string, any> = { success: true };
    if (fromBody) {
      // Cognito returns a new refresh token only when rotation is enabled.
      // If not returned, the original token is still valid - reuse it.
      responseBody.refresh_token = tokens.refresh_token || refreshToken;
    }

    const response = NextResponse.json(responseBody);

    if (tokens.access_token) {
      response.cookies.set('access_token', tokens.access_token, cookieOptions(tokens.expires_in || 3600));
    }
    if (tokens.id_token) {
      response.cookies.set('id_token', tokens.id_token, cookieOptions(tokens.expires_in || 3600));
    }
    // Always re-set the refresh token cookie with a rolling 30-day expiry
    response.cookies.set('refresh_token', refreshToken, cookieOptions(30 * 24 * 60 * 60));

    return response;
  } catch (error) {
    console.error('[Auth Refresh] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
