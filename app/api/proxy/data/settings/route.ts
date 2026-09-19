import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

async function proxy(request: NextRequest, method: 'GET' | 'PUT') {
  const token = request.cookies.get('talvera_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

  const body = method === 'PUT' ? await request.text() : undefined;
  const response = await fetch(`${BACKEND_URL}/api/data/settings`, {
    method,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(
    response.ok ? data : { error: data.error || `Ошибка бэкенда: ${response.status}` },
    { status: response.status },
  );
}

export async function GET(request: NextRequest) {
  try {
    return await proxy(request, 'GET');
  } catch (error) {
    console.error('[Proxy /api/data/settings GET]:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await proxy(request, 'PUT');
  } catch (error) {
    console.error('[Proxy /api/data/settings PUT]:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
