import { NextRequest, NextResponse } from 'next/server';
import { backendErrorResponse } from '@/lib/proxy-response';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const { id } = await params;
  const response = await fetch(`${BACKEND_URL}/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: await request.text(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return backendErrorResponse(data, response.status, `Ошибка бэкенда: ${response.status}`, '/api/proxy/tasks');
  return NextResponse.json(data);
}
