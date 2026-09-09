// lib/dashboard-cache.ts
import { DashboardMetrics } from './types';

const CACHE_KEY = 'hurmo-dashboard-cache-v1';
const STALE_AFTER_HOURS = 12;

export interface CachedDashboard {
  metrics: DashboardMetrics;
  startDate: string;
  endDate: string;
  savedAt: string; // ISO timestamp
}

export function loadCachedDashboard(): CachedDashboard | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedDashboard;
  } catch {
    return null;
  }
}

export function saveCachedDashboard(data: CachedDashboard): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Не удалось сохранить кэш дашборда в localStorage:', err);
  }
}

export function isCacheStale(savedAt: string): boolean {
  const savedTime = new Date(savedAt).getTime();
  const hoursPassed = (Date.now() - savedTime) / (1000 * 60 * 60);
  return hoursPassed > STALE_AFTER_HOURS;
}
