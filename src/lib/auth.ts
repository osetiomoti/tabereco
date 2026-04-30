import { NextRequest, NextResponse } from 'next/server';
import { verifyCognitoToken } from './cognito';
import { prisma } from './prisma';
import type { AuthContext } from '@/types/api';

/**
 * API Authentication Wrapper
 * Verifies Cognito JWT from cookies, syncs user with DB, and runs the handler.
 */
export async function withAuth(
  request: NextRequest,
  handler: (auth: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  // DEV ONLY: bypass Cognito with a dev_token cookie
  if (process.env.NODE_ENV !== 'production') {
    const devToken = request.cookies.get('dev_token')?.value;
    if (devToken) {
      try {
        const payload = JSON.parse(Buffer.from(devToken, 'base64').toString('utf-8'));
        if (payload.dev && payload.userId) {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { group_members: { select: { group_id: true }, take: 1 } },
          });
          if (user) {
            const authContext: AuthContext = {
              userId: user.id,
              cognitoSub: user.cognito_sub,
              email: user.email,
              groupId: user.group_members[0]?.group_id || null,
              idToken: null, // dev bypass — no real id_token available
            };
            return handler(authContext);
          }
        }
      } catch {}
    }
  }

  // 1. Get access_token from cookie
  let token = request.cookies.get('access_token')?.value || null;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  // Read id_token from cookie (used for Identity Pool credential exchange)
  let idToken = request.cookies.get('id_token')?.value || null;

  let cognitoPayload = null;
  let newTokens: any = null;

  if (token) {
    try {
      cognitoPayload = await verifyCognitoToken(token);
    } catch {
      token = null;
    }
  }

  // 2. Refresh token if expired
  if (!cognitoPayload && refreshToken) {
    try {
      newTokens = await refreshTokens(refreshToken);
      token = newTokens.access_token;
      cognitoPayload = await verifyCognitoToken(token!);
      // Use refreshed id_token so Identity Pool exchange doesn't fail with stale token
      if (newTokens.id_token) {
        idToken = newTokens.id_token;
      }
    } catch (e) {
      console.error('[Auth] Refresh failed:', e);
    }
  }

  if (!cognitoPayload || !token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // 3. User Sync (Cognito -> Database)
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { cognito_sub: cognitoPayload.sub },
      include: { group_members: { select: { group_id: true }, take: 1 } },
    });

    if (!user) {
      const email = cognitoPayload.email || '';
      const name = email.split('@')[0] || 'User';
      user = await prisma.user.create({
        data: {
          cognito_sub: cognitoPayload.sub,
          email,
          name,
        },
        include: { group_members: { select: { group_id: true }, take: 1 } },
      });
    }
  } catch (dbError: any) {
    console.error('[Auth] Database sync failed:', dbError);
    return NextResponse.json(
      { success: false, error: 'Database connection failed: ' + dbError.message, code: 'DB_ERROR' },
      { status: 500 }
    );
  }

  const authContext: AuthContext = {
    userId: user.id,
    cognitoSub: user.cognito_sub,
    email: user.email,
    groupId: user.group_members[0]?.group_id || null,
    idToken,  // pass through (refreshed or original)
  };

  const response = await handler(authContext);

  // 4. Set refreshed tokens in cookies if applicable
  if (newTokens) {
    response.cookies.set('access_token', newTokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: newTokens.expires_in,
      path: '/',
    });
    if (newTokens.id_token) {
      response.cookies.set('id_token', newTokens.id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: newTokens.expires_in,
        path: '/',
      });
    }
  }

  return response;
}

/**
 * Cognito Token Refresh Helper
 */
async function refreshTokens(refreshToken: string) {
  const domain = process.env.COGNITO_DOMAIN || process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;

  if (!domain || !clientId) {
    throw new Error('Cognito configuration missing');
  }

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
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }

  return res.json();
}
