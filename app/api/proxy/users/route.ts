import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('talvera_jwt_token')?.value;
    if (!token) {
      return NextResponse.json([], { status: 200 });
    }
    const backendRes = await fetch(`${BACKEND_URL}/api/admin/users`, {
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
