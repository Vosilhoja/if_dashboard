import { NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

export async function GET(request: Request) {
  const token = request.headers.get('cookie')?.match(/hurmo_jwt_token=([^;]+)/)?.[1];
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const response = await fetch(`${BACKEND_URL}/api/system/health`, {
    cache: 'no-store', headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
