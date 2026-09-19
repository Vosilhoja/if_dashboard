import { NextRequest, NextResponse } from 'next/server';
import { backendErrorResponse } from '@/lib/proxy-response';
import { getAuthTokenFromCookies } from '@/lib/auth-token';
import { cookies } from 'next/headers';
import { getBackendUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendUrl();

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromCookies(await cookies());

    if (!token) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/data?${searchParams.toString()}`;

    const backendRes = await fetch(backendUrl, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      console.error(`[Proxy /api/data Error] Status ${backendRes.status}:`, data);
      return backendErrorResponse(data, backendRes.status, `Ошибка бэкенда: ${backendRes.status}`, '/api/proxy/data');
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[Proxy /api/data Exception]:', err);
    return backendErrorResponse(
      { error: err instanceof Error ? err.message : 'Нет подключения к backend', code: 'BACKEND_UNAVAILABLE' },
      502,
      'Нет подключения к backend',
      '/api/proxy/data',
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthTokenFromCookies(await cookies());

    if (!token) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/data?${searchParams.toString()}`;

    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      console.error(`[Proxy /api/data POST Error] Status ${backendRes.status}:`, data);
      return backendErrorResponse(data, backendRes.status, `Ошибка бэкенда: ${backendRes.status}`, '/api/proxy/data');
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[Proxy /api/data POST Exception]:', err);
    return backendErrorResponse(
      { error: err instanceof Error ? err.message : 'Нет подключения к backend', code: 'BACKEND_UNAVAILABLE' },
      502,
      'Нет подключения к backend',
      '/api/proxy/data',
    );
  }
}
