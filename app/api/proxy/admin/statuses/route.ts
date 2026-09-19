import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

async function requestBackend(request: Request, method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
  const token = (await cookies()).get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/api/proxy/admin/statuses/').filter(Boolean);
    const backendPath = pathParts.join('/');
    
    const response = await fetch(`${BACKEND_URL}/api/admin/${backendPath}${url.search}`, {
      method,
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: method !== 'GET' ? await request.text() : undefined,
    });
    
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка запроса к admin API' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return requestBackend(request, 'GET');
}

export async function POST(request: NextRequest) {
  return requestBackend(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return requestBackend(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return requestBackend(request, 'DELETE');
}
