import { NextResponse } from 'next/server';

export function backendErrorResponse(
  data: unknown,
  status: number,
  fallback: string,
  route: string,
) {
  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  return NextResponse.json(
    {
      status: status >= 400 && status < 500 ? 'fail' : 'error',
      code: payload.code || `HTTP_${status}`,
      error: typeof payload.error === 'string' ? payload.error : fallback,
      details: {
        ...(payload.details && typeof payload.details === 'object' ? payload.details : {}),
        proxyRoute: route,
        httpStatus: status,
      },
    },
    { status },
  );
}
