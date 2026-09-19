/**
 * Authentication token helper with migration fallback
 * Reads talvera_jwt_token, falls back to hurmo_jwt_token for smooth migration
 */

export function getAuthToken(request: Request): string | null {
  // Try new cookie first
  const cookieHeader = request.headers.get('cookie') || '';
  const newTokenMatch = cookieHeader.match(/talvera_jwt_token=([^;]+)/);
  if (newTokenMatch) return newTokenMatch[1];

  // Fallback to old cookie for migration
  const oldTokenMatch = cookieHeader.match(/hurmo_jwt_token=([^;]+)/);
  if (oldTokenMatch) return oldTokenMatch[1];

  return null;
}

export function getAuthTokenFromCookies(cookies: any): string | null {
  // Try new cookie first
  const newToken = cookies.get('talvera_jwt_token')?.value;
  if (newToken) return newToken;

  // Fallback to old cookie for migration
  const oldToken = cookies.get('hurmo_jwt_token')?.value;
  if (oldToken) return oldToken;

  return null;
}
