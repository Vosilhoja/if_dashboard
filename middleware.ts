import { NextRequest, NextResponse } from 'next/server';

// Role hierarchy for numeric comparison
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  operator: 2,
  manager: 3,
  admin: 4,
  super_admin: 5,
};

// Route access requirements: [path prefix, minimum role level]
const PROTECTED_ROUTES: Array<{ prefix: string; minRole: number }> = [
  { prefix: '/settings', minRole: ROLE_HIERARCHY.manager },
  { prefix: '/map', minRole: ROLE_HIERARCHY.operator },
  { prefix: '/raw', minRole: ROLE_HIERARCHY.operator },
];

function getRoleLevel(role: string | undefined): number {
  if (!role) return 0;
  return ROLE_HIERARCHY[role] ?? 0;
}

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

  // Check role-based access for protected routes
  const userRole = request.cookies.get('hurmo_user_role')?.value || 'viewer';
  const userLevel = getRoleLevel(userRole);

  for (const route of PROTECTED_ROUTES) {
    if (pathname.startsWith(route.prefix)) {
      if (userLevel < route.minRole) {
        // Redirect to overview with access denied message
        const overviewUrl = new URL('/overview', request.url);
        overviewUrl.searchParams.set('access_denied', '1');
        return NextResponse.redirect(overviewUrl);
      }
      break;
    }
  }

  // Forward user role in header for server components if needed
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
