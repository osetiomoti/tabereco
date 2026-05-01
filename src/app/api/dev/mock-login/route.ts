import { NextRequest, NextResponse } from 'next/server';

/**
 * DEV ONLY: Mock login endpoint
 * Usage: GET /api/dev/mock-login?userId=<user-uuid>
 * Sets a dev_token cookie that bypasses Cognito auth in withAuth()
 */
export async function GET(request: NextRequest) {
  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
  }

  // Create a base64-encoded dev token payload
  const payload = Buffer.from(JSON.stringify({ dev: true, userId })).toString('base64');

  const redirectTo = searchParams.get('redirect') || '/';

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set('dev_token', payload, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return response;
}
