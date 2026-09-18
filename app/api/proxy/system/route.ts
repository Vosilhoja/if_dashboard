import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/health';
    
    const response = await fetch(`${backendUrl}/api/system${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Proxy System] Error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}