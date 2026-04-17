import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware to protect routes using Cognito session cookies.
 */
export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value;
  const devToken = process.env.NODE_ENV !== 'production' ? request.cookies.get('dev_token')?.value : null;

  const { pathname } = request.nextUrl;

  // Paths that don't require authentication
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/api/auth');
  const isDevPage = pathname.startsWith('/dev') || pathname.startsWith('/api/dev');
  const isSetupPage = pathname.startsWith('/api/setup');
  const isStaticFile = pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/);

  if (!accessToken && !devToken && !isAuthPage && !isDevPage && !isSetupPage && !isStaticFile) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if ((accessToken || devToken) && isAuthPage && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/posts';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
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
