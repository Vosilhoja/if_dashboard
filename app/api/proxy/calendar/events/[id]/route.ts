import { NextRequest, NextResponse } from 'next/server';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';
async function proxy(request: NextRequest, id: string, method: 'PATCH' | 'DELETE') {
  const token = request.cookies.get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const response = await fetch(`${BACKEND_URL}/api/calendar/events/${encodeURIComponent(id)}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(method === 'PATCH' ? { 'Content-Type': 'application/json' } : {}) },
    body: method === 'PATCH' ? JSON.stringify(await request.json()) : undefined,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  return data === null ? new NextResponse(null, { status: response.status }) : NextResponse.json(data, { status: response.status });
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { return proxy(request, (await context.params).id, 'PATCH'); }
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) { return proxy(request, (await context.params).id, 'DELETE'); }
