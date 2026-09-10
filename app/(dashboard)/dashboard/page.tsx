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
import { AlertCircle, Clock, FileSpreadsheet, RefreshCw } from 'lucide-react';

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
      const params = new URLSearchParams({
        startDate: start,
        endDate: end,
      });
      if (fresh) params.append('fresh', 'true');
      if (customThreshold) params.append('anomalyThreshold', customThreshold);

      const res = await fetch(`/api/metrics?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data: DashboardMetrics = await res.json();
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
    if (cached) {
      setMetrics(cached.metrics);
      setLastSavedAt(cached.savedAt);
      if (cached.startDate && cached.endDate) {
        setDateRange(cached.startDate, cached.endDate);
      }
    } else {
      fetchMetrics(startDate, endDate, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-primary">
              Период операционной воронки
            </h1>
            <p className="text-xs text-secondary">
              Фильтрация звонков поддержки, SMS и конверсий в регистрацию
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-90 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Загрузка...' : 'Обновить'}</span>
            </button>

            <button
              onClick={() => setIsPeriodDetailsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs border border-border transition-colors cursor-pointer"
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
        <div className="p-2.5 rounded-[6px] bg-neutral-100 dark:bg-surface-2 border border-border text-secondary text-xs flex items-center justify-between gap-2">
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
      <section className="space-y-4">
        <AnomalyWidget metrics={metrics} loading={loading} />

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
