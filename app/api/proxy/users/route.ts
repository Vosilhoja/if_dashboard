import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-url';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('talvera_jwt_token')?.value;
    if (!token) {
      return NextResponse.json([], { status: 200 });
    }
    const backendRes = await fetch(`${getBackendUrl()}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json([], { status: 200 });
    }
    const users = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
    return NextResponse.json(users);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
