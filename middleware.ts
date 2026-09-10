import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow open routes (login, api proxies for auth, static assets)
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/proxy/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Check presence of JWT token
  const token = request.cookies.get('hurmo_jwt_token')?.value;

  if (!token) {
    // If requesting API, return 401 Unauthorized
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    // Redirect unauthenticated users to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward user role in header for server components if needed
  const userRole = request.cookies.get('hurmo_user_role')?.value || 'viewer';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', userRole);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|geojson|json)$).*)',
  ],
};
