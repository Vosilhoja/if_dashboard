import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://if-dashboard-backend.fly.dev';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('hurmo_jwt_token')?.value;

    const backendRes = await fetch(`${BACKEND_URL}/api/data/settings-info`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json({ error: data.error || 'Failed to get settings' }, { status: backendRes.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
