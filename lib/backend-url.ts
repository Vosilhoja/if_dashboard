/**
 * Backend URL configuration
 * Gets the backend URL from environment variable or throws an error in production
 */

export function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!url) {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      return 'http://localhost:5000';
    }
    throw new Error(
      'NEXT_PUBLIC_BACKEND_URL is not configured. ' +
      'Please set this environment variable to your backend API URL.'
    );
  }

  return url;
}
