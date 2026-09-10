import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, isValidSession } from './lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page and login API endpoint
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!isValidSession(cookie)) {
    // If it is an API route, return 401 Unauthorized
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    // Redirect to login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
