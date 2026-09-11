import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai-insights
 * Thin proxy to backend POST /api/ai/insights.
 * The actual Gemini API call happens on the backend — GEMINI_API_KEY never
 * touches the frontend environment.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Не переданы данные метрик для анализа' }, { status: 400 });
    }

    const token = req.cookies.get('hurmo_jwt_token')?.value;

    const backendRes = await fetch(`${BACKEND_URL}/api/ai/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || 'Ошибка аналитического сервиса. Повторите попытку позже.' },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[AI Insights Proxy] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Внутренняя ошибка при формировании аналитического отчёта' },
      { status: 500 }
    );
  }
}
