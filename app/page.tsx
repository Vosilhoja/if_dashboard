'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { Header } from '@/components/Header';
import { DateFilter, FilterMode } from '@/components/DateFilter';
import { MetricsGrid } from '@/components/MetricsGrid';
import { RawDataTabs } from '@/components/RawDataTabs';
import { AnalyticsSection } from '@/components/analytics/AnalyticsSection';
import { DashboardMetrics } from '@/lib/types';
import { formatDateToISO } from '@/lib/date-utils';
import { loadCachedDashboard, saveCachedDashboard, isCacheStale } from '@/lib/dashboard-cache';
import { TableProperties, AlertCircle, Clock, LayoutDashboard, BarChart3, Database } from 'lucide-react';

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 5, 29));
  const [filterMode, setFilterMode] = useState<FilterMode>('week');

  const initialWeekStart = startOfWeek(new Date(2026, 5, 29), { weekStartsOn: 1 });
  const initialWeekEnd = endOfWeek(new Date(2026, 5, 29), { weekStartsOn: 1 });

  const [startDate, setStartDate] = useState<string>(formatDateToISO(initialWeekStart));
  const [endDate, setEndDate] = useState<string>(formatDateToISO(initialWeekEnd));

  const [settingsUrl, setSettingsUrl] = useState<string>('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsFreshData, setNeedsFreshData] = useState(false);

  // Active view tab: 'dashboard' | 'analytics' | 'raw'
  const [activeViewTab, setActiveViewTab] = useState<'dashboard' | 'analytics' | 'raw'>('dashboard');

  useEffect(() => {
    fetch('/api/settings-link')
      .then((res) => res.json())
      .then((data) => {
        if (data.url) setSettingsUrl(data.url);
      })
      .catch((e) => console.error('Failed to load settings URL', e));
  }, []);

  const fetchMetrics = useCallback(
    async (start: string, end: string, refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);
      setNeedsFreshData(false);

      try {
        const params = new URLSearchParams({ startDate: start, endDate: end });
        if (refresh) params.append('refresh', 'true');

        const res = await fetch(`/api/metrics?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data: DashboardMetrics = await res.json();
        setMetrics(data);
        const savedAt = new Date().toISOString();
        setLastSavedAt(savedAt);
        saveCachedDashboard({ metrics: data, startDate: start, endDate: end, savedAt });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить метрики');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // Initial mount: load from localStorage without auto-fetching, unless cache is empty
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

  // Filter change: do NOT auto-fetch from Google Sheets, show "Refresh" prompt
  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setNeedsFreshData(true);
  };

  const handleRefresh = () => {
    fetchMetrics(startDate, endDate, true);
  };

  const stale = lastSavedAt ? isCacheStale(lastSavedAt) : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastSavedAt ?? undefined}
        isStale={stale}
        totalStats={metrics?.totalRows}
        settingsUrl={settingsUrl}
      />

      {/* Navigation sub-tabs */}
      <div className="border-b border-slate-900 bg-slate-900/40 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 py-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveViewTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeViewTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Операционная воронка (8 метрик)</span>
          </button>

          <button
            onClick={() => setActiveViewTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeViewTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>BI-аналитика базы (Power BI)</span>
          </button>

          <button
            onClick={() => setActiveViewTab('raw')}
            className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeViewTab === 'raw'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Сырые таблицы (main, numbers, eskiz)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-8">
        {/* Tab 1: Operational Metrics Dashboard */}
        {activeViewTab === 'dashboard' && (
          <>
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Период операционной воронки
                  </h2>
                  <p className="text-xs text-slate-400">
                    Фильтрация звонков поддержки, SMS и конверсий в регистрацию
                  </p>
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
              />
            </section>

            {needsFreshData && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Период изменён. Нажмите «Обновить данные», чтобы пересчитать метрики за новый диапазон дат.</span>
                </div>
                <button
                  onClick={handleRefresh}
                  className="px-3 py-1.5 min-h-[36px] rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-xs whitespace-nowrap"
                >
                  Обновить
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                <div>
                  <div className="font-semibold">Ошибка при загрузке данных</div>
                  <div className="text-rose-400/80 mt-0.5">{error}</div>
                </div>
              </div>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Ключевые показатели за период
                </h2>
                <span className="text-xs text-slate-400">
                  {startDate} — {endDate}
                </span>
              </div>

              <MetricsGrid metrics={metrics} loading={loading} />
            </section>
          </>
        )}

        {/* Tab 2: BI Analytics Section */}
        {activeViewTab === 'analytics' && (
          <AnalyticsSection />
        )}

        {/* Tab 3: Raw Data Tables Section */}
        {activeViewTab === 'raw' && (
          <section className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <TableProperties className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Сырые данные Google Таблиц
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Просмотр строк напрямую из подключённых баз данных с постраничной пагинацией и поиском по номеру
              </p>
            </div>

            <RawDataTabs />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        HURMO UZ Analytics Dashboard • Google Spreadsheet API Integration • Realtime Metrics & BI
      </footer>
    </div>
  );
}
