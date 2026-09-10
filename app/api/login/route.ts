import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    const configuredPassword = process.env.DASHBOARD_PASSWORD || 'admin';

    if (!password || password !== configuredPassword) {
      return NextResponse.json(
        { error: 'Неверный пароль доступа' },
        { status: 401 }
      );
    }

    const token = getAuthToken(configuredPassword);
    const response = NextResponse.json({ success: true });

    // Cookie expires in 30 days
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
