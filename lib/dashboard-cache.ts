// lib/dashboard-cache.ts
import { DashboardMetrics } from './types';

const CACHE_KEY = 'hurmo-dashboard-cache-v1';
const STALE_AFTER_HOURS = 2; // Reduced from 12 to 2 hours for fresh operational data

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
    const parsed = JSON.parse(raw) as CachedDashboard;
    
    // Validate that the cached metrics contain real data and no fatal errors
    if (!parsed || !parsed.metrics) {
      clearCachedDashboard();
      return null;
    }

    const m = parsed.metrics;
    if (m.callsCount?.error && m.registeredMainBase?.error) {
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
    // Only cache if metrics are valid and not completely empty/errored
    if (!data?.metrics) return;
    const m = data.metrics;
    if (m.callsCount?.error && m.registeredMainBase?.error) {
      return; // Do not cache error responses
    }

    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Не удалось сохранить кэш дашборда в localStorage:', err);
  }
}

export function clearCachedDashboard(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export function isCacheStale(savedAt: string): boolean {
  const savedTime = new Date(savedAt).getTime();
  const hoursPassed = (Date.now() - savedTime) / (1000 * 60 * 60);
  return hoursPassed > STALE_AFTER_HOURS;
}
