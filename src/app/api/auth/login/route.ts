import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/login
 * Redirects the user to the Cognito Hosted UI Login page.
 */
export async function GET(request: NextRequest) {
  const domain = process.env.COGNITO_DOMAIN || process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback`;

  if (!domain || !clientId) {
    return NextResponse.json({ error: 'Cognito configuration missing' }, { status: 500 });
  }

  const loginUrl = `https://${domain}/login?client_id=${clientId}&response_type=code&scope=email+openid+profile+offline_access&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  return NextResponse.redirect(loginUrl);
}
