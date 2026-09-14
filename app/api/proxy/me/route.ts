import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('hurmo_jwt_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Ошибка проверки авторизации' },
        { status: backendRes.status }
      );
    }

    const response = NextResponse.json(data);

    if (data.user) {
      response.cookies.set({
        name: 'hurmo_user_role',
        value: data.user.role || 'viewer',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      response.cookies.set({
        name: 'hurmo_user_permissions',
        value: JSON.stringify(data.user.permissions || []),
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
