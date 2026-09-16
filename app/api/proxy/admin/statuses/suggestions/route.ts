import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

async function proxy(request: NextRequest, method: 'GET' | 'POST') {
  const token = request.cookies.get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  try {
    const body = method === 'POST' ? JSON.stringify(await request.json()) : undefined;
    const queryString = request.nextUrl.searchParams.toString();
    const endpointPath = method === 'POST'
      ? `${BACKEND_URL}/api/admin/statuses/suggestions/${request.nextUrl.searchParams.get('id') || ''}/assign`
      : `${BACKEND_URL}/api/admin/statuses/suggestions${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(
      endpointPath,
      {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body,
        cache: 'no-store',
      },
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка запроса' }, { status: 500 });
  }
}

export function GET(request: NextRequest) {
  return proxy(request, 'GET');
}

export function POST(request: NextRequest) {
  return proxy(request, 'POST');
}
