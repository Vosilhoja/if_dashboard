import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

async function requestBackend(request: Request, method: 'GET' | 'POST') {
  const token = (await cookies()).get('hurmo_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const response = await fetch(`${BACKEND_URL}/api/admin/classify-unmatched${jobId ? `/${encodeURIComponent(jobId)}` : ''}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка запуска проверки' }, { status: 500 });
  }
}

export function POST(request: NextRequest) {
  return requestBackend(request, 'POST');
}

export function GET(request: NextRequest) {
  return requestBackend(request, 'GET');
}
