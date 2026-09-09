'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { Header } from '@/components/Header';
import { DateFilter, FilterMode } from '@/components/DateFilter';
import { MetricsGrid } from '@/components/MetricsGrid';
import { RawDataTabs } from '@/components/RawDataTabs';
import { DashboardMetrics } from '@/lib/types';
import { formatDateToISO } from '@/lib/date-utils';
import { TableProperties, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  // Initialize default date: we saw data in June 2026 (e.g. 30.06.2026)
  // Let's default to a date that exists in the dataset (2026-06-29) or current date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 5, 29)); // 29 June 2026
  const [filterMode, setFilterMode] = useState<FilterMode>('week');

  const initialWeekStart = startOfWeek(new Date(2026, 5, 29), { weekStartsOn: 1 });
  const initialWeekEnd = endOfWeek(new Date(2026, 5, 29), { weekStartsOn: 1 });

  const [startDate, setStartDate] = useState<string>(formatDateToISO(initialWeekStart));
  const [endDate, setEndDate] = useState<string>(formatDateToISO(initialWeekEnd));

  const [settingsUrl, setSettingsUrl] = useState<string>('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      try {
        const params = new URLSearchParams({
          startDate: start,
          endDate: end,
        });
        if (refresh) params.append('refresh', 'true');

        const res = await fetch(`/api/metrics?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data: DashboardMetrics = await res.json();
        setMetrics(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить метрики');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMetrics(startDate, endDate, false);
  }, [startDate, endDate, fetchMetrics]);

  const handleCustomRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleRefresh = () => {
    fetchMetrics(startDate, endDate, true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={metrics?.cachedAt}
        totalStats={metrics?.totalRows}
        settingsUrl={settingsUrl}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-8">
        {/* Filters & Period Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Период аналитики
              </h2>
              <p className="text-xs text-slate-400">
                Фильтрация звонков, отправленных SMS и регистраций по дате
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
            onCustomRangeChange={handleCustomRangeChange}
          />
        </section>

        {/* Global Error Notice if any */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <div className="font-semibold">Произошла ошибка при загрузке данных</div>
              <div className="text-rose-400/80 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* 5 Key Metric Cards */}
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

        {/* Raw Data Tables Section */}
        <section className="space-y-4 pt-4 border-t border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Сырые данные Google Таблиц
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Просмотр строк напрямую из подключённых баз данных с поиском по телефонному номеру
            </p>
          </div>

          <RawDataTabs />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        HURMO UZ Analytics Dashboard • Google Spreadsheet API Integration • Realtime Metrics
      </footer>
    </div>
  );
}
