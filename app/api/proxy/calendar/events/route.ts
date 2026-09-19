import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

async function proxy(request: NextRequest, method: string, path = '/api/calendar/events') {
  const token = request.cookies.get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${BACKEND_URL}${path}${method === 'GET' ? new URL(request.url).search : ''}`, {
    method,
    headers,
    body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(await request.json()),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  return data === null ? new NextResponse(null, { status: response.status }) : NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest) { return proxy(request, 'GET'); }
export async function POST(request: NextRequest) { return proxy(request, 'POST'); }
