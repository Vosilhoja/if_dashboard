import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthToken, verifyPassword } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Check rate limit: 5 failed attempts per 15 minutes
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const minutesLeft = Math.ceil(rateLimit.resetInMs / (60 * 1000));
    return NextResponse.json(
      {
        error: `Слишком много неудачных попыток входа. Попробуйте снова через ${minutesLeft} мин.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.resetInMs / 1000)),
        },
      }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== 'string' || !verifyPassword(password)) {
      recordFailedAttempt(ip);
      const updatedRate = checkRateLimit(ip);
      return NextResponse.json(
        {
          error:
            updatedRate.remaining > 0
              ? `Неверный пароль доступа (осталось попыток: ${updatedRate.remaining})`
              : 'Превышен лимит попыток входа. Доступ временно заблокирован на 15 минут.',
        },
        { status: 401 }
      );
    }

    // Successful login: reset rate limit
    resetRateLimit(ip);

    const token = getAuthToken();
    const response = NextResponse.json({ success: true });

    // Cookie expires in 30 days
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
