import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/callback
 * Handles the redirect from Cognito after successful login.
 * Exchanges the code for tokens and sets session cookies.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const domain = process.env.COGNITO_DOMAIN || process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;

  if (!domain || !clientId) {
    return NextResponse.json({ error: 'Cognito configuration missing' }, { status: 500 });
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
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error('[Auth Callback] Token exchange failed:', errorData);
      return NextResponse.redirect(`${origin}/login?error=token_exchange_failed`);
    }

    const tokens = await res.json();

    // Set cookies and redirect to map
    const response = NextResponse.redirect(`${origin}/map`);

    const cookieOptions = (maxAge: number) => ({
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge,
      expires: new Date(Date.now() + maxAge * 1000),
      path: '/',
    });

    if (tokens.access_token) {
      response.cookies.set('access_token', tokens.access_token, cookieOptions(tokens.expires_in));
    }
    if (tokens.id_token) {
      response.cookies.set('id_token', tokens.id_token, cookieOptions(tokens.expires_in));
    }
    if (tokens.refresh_token) {
      // Refresh tokens usually last much longer (e.g., 30 days)
      response.cookies.set('refresh_token', tokens.refresh_token, cookieOptions(30 * 24 * 60 * 60));

      // Also set a short-lived non-httpOnly cookie so client JS can save to localStorage.
      // This cookie is immediately consumed and deleted by SessionKeepAlive component.
      // This is the same pattern used by AWS Amplify, Auth0, and Firebase for iOS PWA.
      response.cookies.set('rt_transfer', tokens.refresh_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 120, // 2 minutes - just enough for JS to read and store
        expires: new Date(Date.now() + 120 * 1000),
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('[Auth Callback] Error:', error);
    return NextResponse.redirect(`${origin}/login?error=internal_error`);
  }
}
