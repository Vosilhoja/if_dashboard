/**
 * lib/api-client.ts
 * Клиент для безопасного взаимодействия Next.js фронтенда с Express бэкендом
 */

import { DashboardMetrics } from './types';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Базовый URL бэкенда (по умолчанию Fly.io или localhost в dev)
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ifdashboardbackend-production.up.railway.app';

const api = axios.create({
  baseURL: '/api/proxy',
  timeout: 25_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

// Retrying gateway/server errors creates a request storm when the backend is
// overloaded. Only transient client-side throttling/timeouts are retried.
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 503]);
const MAX_RETRIES = 3;
const inFlightGetRequests = new Map<string, Promise<AxiosResponse<unknown>>>();

function isRetryable(error: AxiosError, method: string) {
  if (method.toUpperCase() !== 'GET') return false;
  if (!error.response) return true;
  return RETRYABLE_STATUS_CODES.has(error.response.status);
}

async function request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const method = config.method || 'GET';
  const requestKey = method.toUpperCase() === 'GET'
    ? `${config.baseURL || api.defaults.baseURL || ''}${config.url || ''}`
    : null;

  if (requestKey) {
    const existing = inFlightGetRequests.get(requestKey);
    if (existing) return existing as Promise<AxiosResponse<T>>;
  }

  const requestPromise = requestWithRetry<T>(config);
  if (requestKey) {
    inFlightGetRequests.set(requestKey, requestPromise as Promise<AxiosResponse<unknown>>);
    requestPromise.finally(() => {
      if (inFlightGetRequests.get(requestKey) === requestPromise) {
        inFlightGetRequests.delete(requestKey);
      }
    }).catch(() => undefined);
  }
  return requestPromise;
}

async function requestWithRetry<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const method = config.method || 'GET';
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await api.request<T>(config);
    } catch (error) {
      lastError = error;
      if (!(error instanceof AxiosError) || !isRetryable(error, method) || attempt === MAX_RETRIES) {
        throw error;
      }

      const retryAfter = Number(error.response?.headers?.['retry-after']);
      const delay = Number.isFinite(retryAfter)
        ? Math.min(retryAfter * 1000, 10_000)
        : Math.min(8_000, 500 * 2 ** attempt) + Math.round(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Ошибка сетевого запроса');
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.error || error.response?.data?.message;
    if (typeof message === 'string' && message) return message;
    if (error.code === 'ECONNABORTED') return 'Сервер отвечает слишком долго. Повторите попытку.';
  }
  return error instanceof Error ? error.message : fallback;
}

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
  try {
    const { data } = await request<LoginResponse>({
      url: '/login',
      method: 'POST',
      data: { username, password },
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Ошибка авторизации'));
  }
}

/**
 * Получение профиля текущего пользователя через proxy
 */
export async function getMe(): Promise<AuthUser> {
  try {
    const { data } = await request<{ user: AuthUser }>({ url: '/me' });
    return data.user;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Не удалось получить данные профиля'));
  }
}

/**
 * Выход из системы (удаление httpOnly cookie)
 */
export async function logout(): Promise<void> {
  await request({ url: '/logout', method: 'POST' });
}

/**
 * Получение метрик дашборда (DashboardMetrics)
 */
export async function getMetrics(params: {
  startDate?: string;
  endDate?: string;
  fresh?: boolean;
  anomalyThreshold?: string | number;
  attemptFilter?: string;
  attemptRegion?: string;
  attemptStatus?: string;
  signal?: AbortSignal;
} = {}): Promise<DashboardMetrics> {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.fresh) query.set('refresh', 'true');
  if (params.anomalyThreshold) query.set('anomalyThreshold', String(params.anomalyThreshold));
  if (params.attemptFilter) query.set('attemptFilter', params.attemptFilter);
  if (params.attemptRegion) query.set('attemptRegion', params.attemptRegion);
  if (params.attemptStatus) query.set('attemptStatus', params.attemptStatus);

  try {
    const { data } = await request<DashboardMetrics>({
      url: `/data?${query.toString()}`,
      signal: params.signal,
    });
    return data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw new Error(getErrorMessage(error, 'Не удалось загрузить метрики'));
  }
}

/**
 * Получение строк детализации за период (звонки и незавершенные)
 */
export async function getPeriodDetails(startDate: string, endDate: string) {
  const query = new URLSearchParams();
  if (startDate) query.set('start', startDate);
  if (endDate) query.set('end', endDate);

  try {
    const { data } = await request({
      url: `/data/period?${query.toString()}`,
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить детали периода'));
  }
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

  try {
    const { data } = await request({
      url: `/data/sheets/${encodeURIComponent(type)}?${query.toString()}`,
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить данные таблицы'));
  }
}
