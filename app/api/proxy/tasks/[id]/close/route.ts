import { NextRequest, NextResponse } from 'next/server';
import { backendErrorResponse } from '@/lib/proxy-response';
import { getAuthTokenFromCookies } from '@/lib/auth-token';
import { cookies } from 'next/headers';
import { getBackendUrl } from '@/lib/backend-url';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getAuthTokenFromCookies(await cookies());
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const { id } = await params;
  const response = await fetch(`${getBackendUrl()}/api/tasks/${encodeURIComponent(id)}/close`, {
    method: 'POST',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return backendErrorResponse(data, response.status, `Ошибка закрытия задачи: ${response.status}`, '/api/proxy/tasks');
  return NextResponse.json(data);
}
