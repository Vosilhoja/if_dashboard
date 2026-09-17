import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

async function proxyRequest(
  request: NextRequest,
  params: Promise<{ type: string }>,
  method: 'GET' | 'POST',
) {
  const token = request.cookies.get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

  const { type } = await params;
  const query = method === 'GET' ? `?${new URL(request.url).searchParams.toString()}` : '';
  const backendRes = await fetch(`${BACKEND_URL}/api/data/sheets/${type}${method === 'POST' ? '/full-reload' : ''}${query}`, {
    method,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(
    backendRes.ok ? data : { error: data.error || `Ошибка бэкенда: ${backendRes.status}` },
    { status: backendRes.status },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    return await proxyRequest(request, params, 'GET');
  } catch (err: unknown) {
    console.error('[Proxy /api/data/sheets Exception]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    return await proxyRequest(request, params, 'POST');
  } catch (err: unknown) {
    console.error('[Proxy /api/data/sheets full-reload Exception]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}
