import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('talvera_jwt_token')?.value;

    const { searchParams } = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/data/analytics?${searchParams.toString()}`;

    const backendRes = await fetch(backendUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json({ error: data.error || 'Failed to get analytics' }, { status: backendRes.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
