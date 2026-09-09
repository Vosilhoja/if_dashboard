'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, ViewTab } from '@/components/Sidebar';
import { DateFilter, FilterMode } from '@/components/DateFilter';
import { MetricsGrid } from '@/components/MetricsGrid';
import { RawDataTabs } from '@/components/RawDataTabs';
import { AnalyticsSection } from '@/components/analytics/AnalyticsSection';
import { DashboardMetrics } from '@/lib/types';
import { formatDateToISO } from '@/lib/date-utils';
import { startOfWeek, endOfWeek } from 'date-fns';
import {
  saveCachedDashboard,
  loadCachedDashboard,
  isCacheStale,
} from '@/lib/dashboard-cache';
import { AlertCircle, Clock, TableProperties } from 'lucide-react';

export default function Home() {
  const [activeViewTab, setActiveViewTab] = useState<ViewTab>('dashboard');
  const [filterMode, setFilterMode] = useState<FilterMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Default to current week
  const initialStart = formatDateToISO(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const initialEnd = formatDateToISO(endOfWeek(new Date(), { weekStartsOn: 1 }));

  const [startDate, setStartDate] = useState<string>(initialStart);
  const [endDate, setEndDate] = useState<string>(initialEnd);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [needsFreshData, setNeedsFreshData] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [settingsUrl, setSettingsUrl] = useState<string | undefined>(undefined);

  const fetchMetrics = async (start: string, end: string, fresh = false) => {
    if (fresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: start,
        endDate: end,
      });
      if (fresh) params.append('fresh', 'true');

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
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settingsUrl) {
          setSettingsUrl(data.settingsUrl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cached = loadCachedDashboard();
    if (cached) {
      setMetrics(cached.metrics);
      setLastSavedAt(cached.savedAt);
      setStartDate(cached.startDate);
      setEndDate(cached.endDate);
    } else {
      fetchMetrics(startDate, endDate, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter change: if autoFetch is true (prev/next week or preset), fetch immediately
  const handleDateRangeChange = (start: string, end: string, autoFetch = false) => {
    setStartDate(start);
    setEndDate(end);
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
    <div className="min-h-screen bg-page text-primary flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeViewTab}
        onTabChange={setActiveViewTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastSavedAt ?? undefined}
        isStale={stale}
        totalStats={metrics?.totalRows}
        settingsUrl={settingsUrl}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
          {/* Tab 1: Operational Metrics Dashboard */}
          {activeViewTab === 'dashboard' && (
            <>
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-primary tracking-tight">
                    Период операционной воронки
                  </h2>
                  <p className="text-xs text-secondary mt-0.5">
                    Фильтрация звонков поддержки, SMS и конверсий в регистрацию
                  </p>
                </div>

                <DateFilter
                  mode={filterMode}
                  onModeChange={setFilterMode}
                  currentDate={currentDate}
                  onCurrentDateChange={setCurrentDate}
                  startDate={startDate}
                  endDate={endDate}
                  onCustomRangeChange={handleDateRangeChange}
                />
              </section>

              {needsFreshData && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Период изменён вручную. Нажмите «Обновить данные», чтобы пересчитать метрики.</span>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg bg-amber-500 text-white font-semibold text-xs whitespace-nowrap cursor-pointer shadow-sm"
                  >
                    Обновить
                  </button>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-semibold">Ошибка при загрузке данных</div>
                    <div className="mt-0.5">{error}</div>
                  </div>
                </div>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-primary tracking-tight">
                    Ключевые показатели за период
                  </h2>
                  <span className="text-xs text-secondary">
                    {startDate} — {endDate}
                  </span>
                </div>

                <MetricsGrid metrics={metrics} loading={loading} />
              </section>
            </>
          )}

          {/* Tab 2: BI Analytics Section */}
          {activeViewTab === 'analytics' && <AnalyticsSection />}

          {/* Tab 3: Raw Data Tables Section */}
          {activeViewTab === 'raw' && (
            <section className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <TableProperties className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-bold text-primary tracking-tight">
                    Сырые данные Google Таблиц
                  </h2>
                </div>
                <p className="text-xs text-secondary mt-1">
                  Просмотр строк напрямую из подключённых баз данных с постраничной пагинацией и поиском по номеру
                </p>
              </div>

              <RawDataTabs />
            </section>
          )}
        </div>

        {/* Minimal Footer */}
        <footer className="border-t border-border py-4 px-4 text-center text-xs text-secondary mt-auto">
          HURMO UZ Analytics Dashboard • Google Spreadsheet API Integration
        </footer>
      </main>
    </div>
  );
}
