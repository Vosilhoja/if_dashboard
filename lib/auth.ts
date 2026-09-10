export const AUTH_COOKIE_NAME = 'hurmo_dashboard_auth';

// Simple deterministic hash for verification without exposing plain password in cookie
export function getAuthToken(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hurmo_auth_${Math.abs(hash).toString(16)}`;
}

export function isValidSession(cookieValue: string | undefined): boolean {
  const expectedPassword = process.env.DASHBOARD_PASSWORD || 'admin';
  if (!cookieValue) return false;
  const expectedToken = getAuthToken(expectedPassword);
  return cookieValue === expectedToken;
}
