import { NextRequest, NextResponse } from 'next/server';
import { backendErrorResponse } from '@/lib/proxy-response';
import { getAuthTokenFromCookies } from '@/lib/auth-token';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

async function forward(request: NextRequest, method: string, path = '/api/tasks') {
  const token = getAuthTokenFromCookies(await cookies());
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const body = method === 'GET' ? undefined : await request.text();
  const url = `${BACKEND_URL}${path}${method === 'GET' ? `?${new URL(request.url).searchParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return backendErrorResponse(data, response.status, `Ошибка бэкенда: ${response.status}`, '/api/proxy/tasks');
  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest) { return forward(request, 'GET'); }
export async function POST(request: NextRequest) { return forward(request, 'POST'); }
