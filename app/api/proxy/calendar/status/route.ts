import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-url';
export async function GET(request: NextRequest) {
  const token = request.cookies.get('talvera_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  const response = await fetch(`${getBackendUrl()}/api/calendar/status`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}
