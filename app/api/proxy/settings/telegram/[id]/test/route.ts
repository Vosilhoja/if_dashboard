import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendUrl } from '@/lib/backend-url';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const token = (await cookies()).get('talvera_jwt_token')?.value;
  if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Некорректный ID бота' }, { status: 400 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/api/settings/telegram/${id}/test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка проверки Telegram-бота' },
      { status: 502 },
    );
  }
}
