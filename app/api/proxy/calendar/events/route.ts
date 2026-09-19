import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const query = new URL(request.url).search;
  const response = await fetch(`${BACKEND_URL}/api/calendar/events${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
