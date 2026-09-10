/**
 * In-memory rate limiting for login attempts
 * Limits failed attempts to 5 per 15 minutes per IP
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS,
      resetInMs: WINDOW_MS,
    };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, record.resetAt - now),
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - record.count,
    resetInMs: Math.max(0, record.resetAt - now),
  };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
  } else {
    record.count += 1;
  }
}

export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}
