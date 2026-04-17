import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/logout
 * Clears session cookies and redirects to Cognito logout or home.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;

  const response = NextResponse.redirect(`${origin}/login`);

  // Clear cookies
  response.cookies.set('access_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('id_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('dev_token', '', { maxAge: 0, path: '/' });

  // Optional: Redirect to Cognito logout 
  if (domain && clientId) {
    const logoutUrl = `https://${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(origin + '/login')}`;
    return NextResponse.redirect(logoutUrl);
  }

  return response;
}
