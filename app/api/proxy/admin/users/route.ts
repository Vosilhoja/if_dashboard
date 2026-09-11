import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://if-dashboard-backend.fly.dev';

/** GET /api/proxy/admin/users — список пользователей */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('hurmo_jwt_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Ошибка получения пользователей' },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/** POST /api/proxy/admin/users — создание нового пользователя */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('hurmo_jwt_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const backendRes = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Ошибка создания пользователя' },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
