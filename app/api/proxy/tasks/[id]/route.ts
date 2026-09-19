import { NextRequest, NextResponse } from 'next/server';
import { backendErrorResponse } from '@/lib/proxy-response';
import { getAuthTokenFromCookies } from '@/lib/auth-token';
import { cookies } from 'next/headers';
import { getBackendUrl } from '@/lib/backend-url';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getAuthTokenFromCookies(await cookies());
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const { id } = await params;
  const response = await fetch(`${getBackendUrl()}/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: await request.text(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return backendErrorResponse(data, response.status, `Ошибка бэкенда: ${response.status}`, '/api/proxy/tasks');
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getAuthTokenFromCookies(await cookies());
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const { id } = await params;
  const response = await fetch(`${getBackendUrl()}/api/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 204 || response.ok) {
    return new NextResponse(null, { status: 204 });
  }
  const data = await response.json().catch(() => ({}));
  return backendErrorResponse(data, response.status, `Ошибка удаления задачи: ${response.status}`, '/api/proxy/tasks');
}
