import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

async function proxy(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const { id } = await context.params;
  const response = await fetch(`${BACKEND_URL}/api/settings/telegram/${id}`, {
    method: request.method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: request.method === 'DELETE' ? undefined : await request.text(),
    cache: 'no-store',
  });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}

export const PATCH = proxy;
export const DELETE = proxy;
