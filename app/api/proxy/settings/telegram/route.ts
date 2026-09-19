import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

async function requestBackend(
  request: Request,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  pathSuffix = '',
) {
  const token = (await cookies()).get('talvera_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const response = await fetch(`${BACKEND_URL}/api/settings/telegram${pathSuffix}${url.search}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: method !== 'GET' ? await request.text() : undefined,
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка запроса к настройкам Telegram' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return requestBackend(request, 'GET', url.pathname.endsWith('/capabilities') ? '/capabilities' : '');
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const idMatch = url.pathname.match(/\/telegram\/(\d+)\/test$/);
  return requestBackend(request, 'POST', idMatch ? `/${idMatch[1]}/test` : '');
}

export async function PUT(request: NextRequest) {
  return requestBackend(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return requestBackend(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return requestBackend(request, 'DELETE');
}
