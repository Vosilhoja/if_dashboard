import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const token = request.cookies.get('hurmo_jwt_token')?.value;
    if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

    const { type } = await params;
    const backendRes = await fetch(`${BACKEND_URL}/api/data/sheets/${type}/connection`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(
      backendRes.ok ? data : { error: data.error || `Ошибка бэкенда: ${backendRes.status}` },
      { status: backendRes.status },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}
