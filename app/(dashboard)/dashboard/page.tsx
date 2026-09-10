'use client';

import React, { useState, useEffect } from 'react';
import { DateFilter, FilterMode } from '@/components/DateFilter';
import { MetricsGrid } from '@/components/MetricsGrid';
import { DashboardMetrics } from '@/lib/types';
import { formatDateToISO } from '@/lib/date-utils';
import { startOfWeek, endOfWeek } from 'date-fns';
import {
  saveCachedDashboard,
  loadCachedDashboard,
  isCacheStale,
} from '@/lib/dashboard-cache';
import { PeriodDetailsPanel } from '@/components/PeriodDetailsPanel';
import { AnomalyWidget } from '@/components/AnomalyWidget';
import { AIInsightsWidget } from '@/components/AIInsightsWidget';
import { AlertCircle, Clock, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { getMetrics } from '@/lib/api-client';

import { useAnalyticsFilter } from '@/lib/analytics-filter-context';

export default function DashboardPage() {
  const {
    startDate,
    endDate,
    filterMode,
    currentDate,
    weekStartsOn,
    setFilterMode,
    setCurrentDate,
    setDateRange,
  } = useAnalyticsFilter();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [needsFreshData, setNeedsFreshData] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isPeriodDetailsOpen, setIsPeriodDetailsOpen] = useState<boolean>(false);

  const fetchMetrics = async (start: string, end: string, fresh = false) => {
    if (fresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Read custom anomaly threshold from localStorage if configured in settings
      const customThreshold = typeof window !== 'undefined' ? localStorage.getItem('hurmo_anomaly_threshold') : null;
      
      const data = await getMetrics({
        startDate: filterMode !== 'alltime' ? start : undefined,
        endDate: filterMode !== 'alltime' ? end : undefined,
        fresh,
        anomalyThreshold: customThreshold || undefined,
      });

      setMetrics(data);
      setNeedsFreshData(false);

      const savedTime = new Date().toISOString();
      setLastSavedAt(savedTime);
      saveCachedDashboard({
        metrics: data,
        startDate: start,
        endDate: end,
        savedAt: savedTime,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке метрик');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const cached = loadCachedDashboard();
    if (cached && !isCacheStale(cached.savedAt)) {
      // Only restore metrics if cache is fresh; never override the date context
      // (the date context already defaults to the current week)
      setMetrics(cached.metrics);
      setLastSavedAt(cached.savedAt);
    } else {
      fetchMetrics(startDate, endDate, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background auto-refresh interval (configured in Settings)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    try {
      const saved = localStorage.getItem('hurmo_auto_refresh_interval');
      const minutes = saved !== null ? parseInt(saved, 10) : 3;
      if (minutes > 0) {
        intervalId = setInterval(() => {
          fetchMetrics(startDate, endDate, true);
        }, minutes * 60 * 1000);
      }
    } catch {
      // ignore in SSR
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [startDate, endDate]);

  const handleDateRangeChange = (start: string, end: string, autoFetch = false) => {
    setDateRange(start, end);
    if (autoFetch) {
      fetchMetrics(start, end, true);
    } else {
      setNeedsFreshData(true);
    }
  };

  const handleRefresh = () => {
    fetchMetrics(startDate, endDate, true);
  };

  const stale = lastSavedAt ? isCacheStale(lastSavedAt) : false;

  return (
    <div className="space-y-6">
      {/* Header with period selector & refresh */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40 sm:border-0">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
              Операционная воронка
            </h1>
            <p className="text-xs text-secondary">
              Фильтрация звонков поддержки, SMS и конверсий в регистрацию
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="active-press flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white hover:opacity-90 disabled:opacity-50 text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Загрузка...' : 'Обновить'}</span>
            </button>

            <button
              onClick={() => setIsPeriodDetailsOpen(true)}
              className="active-press flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs font-semibold border border-border transition-colors cursor-pointer shrink-0"
              title="Показать строки звонков и недошедших за выбранный период"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
              <span>Детали периода</span>
            </button>
          </div>
        </div>

        <DateFilter
          mode={filterMode}
          onModeChange={setFilterMode}
          currentDate={currentDate}
          onCurrentDateChange={setCurrentDate}
          startDate={startDate}
          endDate={endDate}
          onCustomRangeChange={handleDateRangeChange}
          weekStartsOn={weekStartsOn}
        />
      </section>

      {needsFreshData && (
        <div className="p-3 rounded-[6px] bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span>Период изменён. Нажмите «Обновить», чтобы пересчитать метрики за новый диапазон.</span>
          </div>
          <button
            onClick={handleRefresh}
            className="px-2.5 py-1 rounded-[4px] bg-amber-500 text-white font-medium text-xs whitespace-nowrap cursor-pointer"
          >
            Обновить
          </button>
        </div>
      )}

      {stale && !needsFreshData && (
        <div className="p-2.5 rounded-[6px] bg-surface-2 border border-border text-secondary text-xs flex items-center justify-between gap-2">
          <span>Данные получены более 15 минут назад.</span>
          <button
            onClick={handleRefresh}
            className="text-accent hover:underline font-medium text-xs cursor-pointer"
          >
            Синхронизировать сейчас
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Anomaly detection & metrics grid */}
      <section id="anomalies" className="space-y-4">
        <AnomalyWidget metrics={metrics} loading={loading} />
        <AIInsightsWidget metrics={metrics} loading={loading} />

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">
            Показатели воронки ({startDate} — {endDate})
          </h2>
        </div>

        <MetricsGrid metrics={metrics} loading={loading} />
      </section>

      {/* Period Details Drawer */}
      <PeriodDetailsPanel
        startDate={startDate}
        endDate={endDate}
        isOpen={isPeriodDetailsOpen}
        onClose={() => setIsPeriodDetailsOpen(false)}
      />
    </div>
  );
}
