// lib/dashboard-cache.ts
import { DashboardMetrics } from './types';

const CACHE_KEY = 'hurmo-dashboard-cache-v2';
const STALE_AFTER_MS = 2 * 60 * 1000; // 2 minutes — after that always refetch

export interface CachedDashboard {
  metrics: DashboardMetrics;
  startDate: string;
  endDate: string;
  savedAt: string;
}

function totalLoadedRows(metrics: DashboardMetrics): number {
  const t = metrics.totalRows;
  if (!t) return 0;
  return (t.main || 0) + (t.numbers || 0) + (t.eskiz || 0) + (t.not_completed || 0);
}

/** Cache with API errors or zero loaded rows must not block a live request. */
export function isUnusableCache(metrics: DashboardMetrics | null | undefined): boolean {
  if (!metrics) return true;
  if (totalLoadedRows(metrics) === 0) return true;
  if (metrics.callsCount?.error && metrics.registeredMainBase?.error) return true;
  if (metrics.callsCount?.value === '—' && metrics.registeredMainBase?.value === '—') return true;
  return false;
}

export function loadCachedDashboard(): CachedDashboard | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      window.localStorage.removeItem('hurmo-dashboard-cache-v1');
      return null;
    }
    const parsed = JSON.parse(raw) as CachedDashboard;

    if (!parsed || isUnusableCache(parsed.metrics)) {
      clearCachedDashboard();
      return null;
    }

    return parsed;
  } catch {
    clearCachedDashboard();
    return null;
  }
}

export function saveCachedDashboard(data: CachedDashboard): void {
  if (typeof window === 'undefined') return;
  try {
    if (isUnusableCache(data?.metrics)) return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Не удалось сохранить кэш дашборда в localStorage:', err);
  }
}

export function clearCachedDashboard(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
    window.localStorage.removeItem('hurmo-dashboard-cache-v1');
  } catch {
    // ignore
  }
}

export function isCacheStale(savedAt: string): boolean {
  const savedTime = new Date(savedAt).getTime();
  return Date.now() - savedTime > STALE_AFTER_MS;
}
