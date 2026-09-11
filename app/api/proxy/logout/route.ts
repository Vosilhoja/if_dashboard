import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: 'hurmo_jwt_token',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  response.cookies.set({
    name: 'hurmo_user_role',
    value: '',
    httpOnly: false,
    path: '/',
    maxAge: 0,
  });

  response.cookies.set({
    name: 'hurmo_user_permissions',
    value: '',
    httpOnly: false,
    path: '/',
    maxAge: 0,
  });

  // Also clean old cookie if present
  response.cookies.set({
    name: 'hurmo_dashboard_auth',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
