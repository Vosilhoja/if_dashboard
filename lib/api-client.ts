/**
 * lib/api-client.ts
 * Клиент для безопасного взаимодействия Next.js фронтенда с Express бэкендом
 */

import { DashboardMetrics } from './types';

// Базовый URL бэкенда (по умолчанию Fly.io или localhost в dev)
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://if-dashboard-backend.fly.dev';

export interface AuthUser {
  id: number;
  username: string;
  fullName?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'operator' | 'viewer';
  permissions: string[];
  telegramLinked?: boolean;
}

export interface LoginResponse {
  status: string;
  message?: string;
  user: AuthUser;
}

/**
 * Авторизация через тонкий Next.js proxy роут.
 * JWT токен сохраняется на сервере в httpOnly cookie и никогда не попадает в localStorage.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/api/proxy/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Ошибка авторизации');
  }

  return data;
}

/**
 * Получение профиля текущего пользователя через proxy
 */
export async function getMe(): Promise<AuthUser> {
  const res = await fetch('/api/proxy/me');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось получить данные профиля');
  }
  return data.user;
}

/**
 * Выход из системы (удаление httpOnly cookie)
 */
export async function logout(): Promise<void> {
  await fetch('/api/proxy/logout', { method: 'POST' });
}

/**
 * Получение метрик дашборда (DashboardMetrics)
 */
export async function getMetrics(params: {
  startDate?: string;
  endDate?: string;
  fresh?: boolean;
  anomalyThreshold?: string | number;
} = {}): Promise<DashboardMetrics> {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.fresh) query.set('refresh', 'true');
  if (params.anomalyThreshold) query.set('anomalyThreshold', String(params.anomalyThreshold));

  const res = await fetch(`/api/proxy/data?${query.toString()}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data as DashboardMetrics;
}

/**
 * Получение строк детализации за период (звонки и незавершенные)
 */
export async function getPeriodDetails(startDate: string, endDate: string) {
  const query = new URLSearchParams();
  if (startDate) query.set('start', startDate);
  if (endDate) query.set('end', endDate);

  const res = await fetch(`/api/proxy/data/period?${query.toString()}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

/**
 * Пагинация и поиск по сырым таблицам
 */
export async function getSheetData(type: string, page = 1, pageSize = 25, search = '') {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) query.set('search', search);

  const res = await fetch(`/api/proxy/data/sheets/${type}?${query.toString()}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}
