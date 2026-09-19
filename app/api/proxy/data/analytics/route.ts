import { NextRequest, NextResponse } from 'next/server';
import { backendErrorResponse } from '@/lib/proxy-response';
import { getBackendUrl } from '@/lib/backend-url';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('talvera_jwt_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backendUrl = `${getBackendUrl()}/api/data/analytics?${searchParams.toString()}`;

    const backendRes = await fetch(backendUrl, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return backendErrorResponse(data, backendRes.status, `Ошибка бэкенда: ${backendRes.status}`, '/api/proxy/data/analytics');
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
