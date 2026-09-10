import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://if-dashboard-backend.fly.dev';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Логин и пароль обязательны для входа' },
        { status: 400 }
      );
    }

    // Call backend API
    const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Ошибка входа' },
        { status: backendRes.status }
      );
    }

    // Create response and set httpOnly cookie with backend JWT
    const response = NextResponse.json({
      status: 'success',
      user: data.user,
    });

    response.cookies.set({
      name: 'hurmo_jwt_token',
      value: data.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days matching JWT
    });

    // Also store minimal non-sensitive user role cookie for fast SSR/middleware checks
    response.cookies.set({
      name: 'hurmo_user_role',
      value: data.user?.role || 'viewer',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    console.error('Login proxy error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
