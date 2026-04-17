import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/dev/mock-login?userId=<uuid>
 * 
 * Development-only endpoint to authenticate without Cognito.
 * Sets a dev session cookie that bypasses JWT verification.
 * Only available when NODE_ENV !== 'production'.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  const origin = request.nextUrl.origin;

  // If no userId provided, list all available users for convenience
  if (!userId) {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
      take: 20,
    });
    return NextResponse.json({ users, hint: `Use /api/dev/mock-login?userId=<id> to log in` });
  }

  // Find or create the user
  let user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    // Also try by cognito_sub
    user = await prisma.user.findFirst({
      where: { cognito_sub: userId },
    });
  }

  if (!user) {
    return NextResponse.json(
      { error: `User not found: ${userId}` },
      { status: 404 }
    );
  }

  // Create a dev session token (simple signed cookie with userId)
  const devToken = Buffer.from(
    JSON.stringify({ userId: user.id, dev: true, iat: Date.now() })
  ).toString('base64');

  const response = NextResponse.redirect(`${origin}/posts`);
  response.cookies.set('dev_token', devToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  });

  return response;
}
