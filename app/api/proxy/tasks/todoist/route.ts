import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromCookies } from '@/lib/auth-token';
import { cookies } from 'next/headers';
import { getBackendUrl } from '@/lib/backend-url';

export async function GET(request: NextRequest) {
  const token = getAuthTokenFromCookies(await cookies());
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const response = await fetch(`${getBackendUrl()}/api/tasks?source=todoist`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
