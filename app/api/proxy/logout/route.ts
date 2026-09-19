import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clean new cookies
  response.cookies.set({
    name: 'talvera_jwt_token',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  response.cookies.set({
    name: 'talvera_user_role',
    value: '',
    httpOnly: false,
    path: '/',
    maxAge: 0,
  });

  response.cookies.set({
    name: 'talvera_user_permissions',
    value: '',
    httpOnly: false,
    path: '/',
    maxAge: 0,
  });

  // Clean old cookies for migration fallback
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

  // Also clean very old cookie if present
  response.cookies.set({
    name: 'hurmo_dashboard_auth',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
