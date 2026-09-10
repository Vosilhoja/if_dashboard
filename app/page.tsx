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
import { PeriodDetailsPanel } from '@/components/PeriodDetailsPanel';
import { AnomalyWidget } from '@/components/AnomalyWidget';
import { AlertCircle, Clock, TableProperties, FileSpreadsheet } from 'lucide-react';

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
  const [isPeriodDetailsOpen, setIsPeriodDetailsOpen] = useState<boolean>(false);

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
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Tab 1: Operational Metrics Dashboard */}
          {activeViewTab === 'dashboard' && (
            <>
              <section className="space-y-2.5">
                <div>
                  <h2 className="text-sm font-semibold text-primary">
                    Период операционной воронки
                  </h2>
                  <p className="text-[11px] text-secondary">
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
                <div className="p-2.5 rounded-[6px] bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>Период изменён. Нажмите «Обновить данные», чтобы пересчитать метрики.</span>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="px-2.5 py-1 rounded-[4px] bg-amber-500 text-white font-medium text-xs whitespace-nowrap cursor-pointer"
                  >
                    Обновить
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <section className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-primary">
                      Показатели воронки за период
                    </h2>
                    <span className="text-xs text-secondary tabular-nums">
                      ({startDate} — {endDate})
                    </span>
                  </div>

                  <button
                    onClick={() => setIsPeriodDetailsOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs border border-border transition-colors cursor-pointer"
                    title="Показать строки звонков и недошедших за выбранный период"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
                    <span>Детали периода</span>
                  </button>
                </div>

                <AnomalyWidget metrics={metrics} loading={loading} />

                <MetricsGrid metrics={metrics} loading={loading} />
              </section>

              {/* Period Details Drawer */}
              <PeriodDetailsPanel
                startDate={startDate}
                endDate={endDate}
                isOpen={isPeriodDetailsOpen}
                onClose={() => setIsPeriodDetailsOpen(false)}
              />
            </>
          )}

          {/* Tab 2: BI Analytics Section */}
          {activeViewTab === 'analytics' && <AnalyticsSection />}

          {/* Tab 3: Raw Data Tables Section */}
          {activeViewTab === 'raw' && (
            <section className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <TableProperties className="w-4 h-4 text-secondary" />
                  <h2 className="text-sm font-semibold text-primary">
                    Сырые данные Google Таблиц
                  </h2>
                </div>
                <p className="text-[11px] text-secondary mt-0.5">
                  Просмотр строк напрямую из подключённых баз данных с постраничной пагинацией и поиском по номеру
                </p>
              </div>

              <RawDataTabs />
            </section>
          )}
        </div>

        {/* Minimal Footer */}
        <footer className="border-t border-border py-3 px-4 text-center text-[11px] text-secondary mt-auto">
          HURMO UZ Analytics Dashboard • Google Spreadsheet API
        </footer>
      </main>
    </div>
  );
}
