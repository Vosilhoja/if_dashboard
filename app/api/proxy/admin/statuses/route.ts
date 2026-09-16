import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

async function proxy(request: NextRequest, method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
  try {
    const token = request.cookies.get('hurmo_jwt_token')?.value;
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const body = method === 'GET' ? undefined : JSON.stringify(await request.json());
    const backendRes = await fetch(`${BACKEND_URL}/api/admin/statuses${method === 'GET' ? '' : '/phrases'}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
      cache: 'no-store',
    });
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка запроса статусов' },
      { status: 500 }
    );
  }
}

export function GET(request: NextRequest) {
  return proxy(request, 'GET');
}

export function POST(request: NextRequest) {
  return proxy(request, 'POST');
}

export function DELETE(request: NextRequest) {
  return proxy(request, 'DELETE');
}

export function PUT(request: NextRequest) {
  return proxy(request, 'PUT');
}
