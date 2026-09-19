import { NextRequest, NextResponse } from 'next/server';
import { backendErrorResponse } from '@/lib/proxy-response';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function GET(request: NextRequest) {
  const token = request.cookies.get('talvera_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

  try {
    const response = await fetch(`${BACKEND_URL}/api/data/sync/status`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return backendErrorResponse(data, response.status, `Ошибка бэкенда: ${response.status}`, '/api/proxy/data/sync/status');
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('[Proxy /api/data/sync/status Exception]:', error);
    return backendErrorResponse(
      { error: error instanceof Error ? error.message : 'Нет подключения к backend', code: 'BACKEND_UNAVAILABLE' },
      502,
      'Нет подключения к backend',
      '/api/proxy/data/sync/status',
    );
  }
}
