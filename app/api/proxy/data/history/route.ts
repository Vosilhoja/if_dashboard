import { NextRequest, NextResponse } from 'next/server';
import { backendErrorResponse } from '@/lib/proxy-response';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const response = await fetch(`${BACKEND_URL}/api/data/history?${new URL(request.url).searchParams}`, {
    cache: 'no-store', headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return backendErrorResponse(data, response.status, `Ошибка бэкенда: ${response.status}`, '/api/proxy/data/history');
  return NextResponse.json(data);
}
