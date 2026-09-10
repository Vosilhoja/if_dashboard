import { createHmac, timingSafeEqual } from 'crypto';

export const AUTH_COOKIE_NAME = 'hurmo_dashboard_auth';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET не задан в .env.local — сгенерируй случайную строку (например `openssl rand -hex 32`) и добавь в .env.local'
    );
  }
  return secret;
}

// Токен = HMAC-SHA256(secret, "hurmo-dashboard-session"), секрет никогда не попадает в код/репозиторий
export function getAuthToken(): string {
  const hmac = createHmac('sha256', getSessionSecret());
  hmac.update('hurmo-dashboard-session');
  return hmac.digest('hex');
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  try {
    const expected = getAuthToken();
    const a = Buffer.from(cookieValue, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  const configured = process.env.DASHBOARD_PASSWORD;
  if (!configured) {
    throw new Error('DASHBOARD_PASSWORD не задан в .env.local');
  }
  // timing-safe сравнение пароля
  const a = Buffer.from(password);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
