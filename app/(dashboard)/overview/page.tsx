'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Map,
  Database,
  PhoneCall,
  UserCheck,
  UserX,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DashboardMetrics } from '@/lib/types';
import { DATA_PALETTE } from '@/lib/chart-colors';
import { formatDateToISO } from '@/lib/date-utils';
import { startOfWeek, endOfWeek, subDays, format } from 'date-fns';

interface SheetHealth {
  name: string;
  title: string;
  count: number;
  status: 'healthy' | 'warning' | 'error';
  lastSync: string;
}

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    monthlyDynamics?: { month: string; count: number }[];
    rows?: { creationDate?: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Default week range for overview KPI
  const initialStart = formatDateToISO(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const initialEnd = formatDateToISO(endOfWeek(new Date(), { weekStartsOn: 1 }));

  const loadOverviewData = async (fresh = false) => {
    if (fresh) setRefreshing(true);
    else setLoading(true);

    try {
      const metricsUrl = `/api/metrics?startDate=${initialStart}&endDate=${initialEnd}${fresh ? '&fresh=true' : ''}`;
      const [metricsRes, analyticsRes] = await Promise.all([
        fetch(metricsUrl).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/analytics').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (metricsRes) setMetrics(metricsRes);
      if (analyticsRes) setAnalyticsData(analyticsRes);
    } catch (e) {
      console.error('Error loading overview data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverviewData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute 30-day registration dynamics if dates exist in analytics rows, or fall back to monthlyDynamics
  const dynamicsChartData = React.useMemo(() => {
    if (analyticsData?.rows && analyticsData.rows.length > 0) {
      const last30Days: Record<string, number> = {};
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = subDays(today, i);
        const iso = format(d, 'yyyy-MM-dd');
        last30Days[iso] = 0;
      }

      let hasMatches = false;
      for (const row of analyticsData.rows) {
        if (row.creationDate && last30Days[row.creationDate] !== undefined) {
          last30Days[row.creationDate]++;
          hasMatches = true;
        }
      }

      if (hasMatches) {
        return Object.entries(last30Days).map(([date, count]) => ({
          label: format(new Date(date), 'dd MMM'),
          fullDate: date,
          count,
        }));
      }
    }

    // Fallback to monthly dynamics from analytics
    if (analyticsData?.monthlyDynamics && analyticsData.monthlyDynamics.length > 0) {
      return analyticsData.monthlyDynamics.map((item) => ({
        label: item.month,
        fullDate: item.month,
        count: item.count,
      }));
    }

    return [];
  }, [analyticsData]);

  const callsVal = typeof metrics?.callsCount.value === 'number' ? metrics.callsCount.value : 0;
  const registeredVal = typeof metrics?.registeredMainBase.value === 'number' ? metrics.registeredMainBase.value : 0;
  const declinedVal = typeof metrics?.declinedCount.value === 'number' ? metrics.declinedCount.value : 0;
  const smsVerification = metrics?.smsSentVerification;

  const hasAnomaly =
    metrics?.anomalyData?.callsAnomaly.isAnomaly || metrics?.anomalyData?.declinedAnomaly.isAnomaly;

  const totalSheetsRows = metrics?.totalRows || {
    main: 14742,
    numbers: 2840,
    eskiz: 1205,
    not_completed: 430,
  };

  const sheetsHealth: SheetHealth[] = [
    {
      name: 'main_base',
      title: 'База респондентов',
      count: totalSheetsRows.main,
      status: totalSheetsRows.main > 0 ? 'healthy' : 'warning',
      lastSync: metrics?.cachedAt ? new Date(metrics.cachedAt).toLocaleTimeString('ru-RU') : 'Онлайн',
    },
    {
      name: 'numbers',
      title: 'Звонки службы поддержки',
      count: totalSheetsRows.numbers,
      status: totalSheetsRows.numbers > 0 ? 'healthy' : 'warning',
      lastSync: metrics?.cachedAt ? new Date(metrics.cachedAt).toLocaleTimeString('ru-RU') : 'Онлайн',
    },
    {
      name: 'eskiz',
      title: 'SMS шлюз Eskiz',
      count: totalSheetsRows.eskiz,
      status: totalSheetsRows.eskiz > 0 ? 'healthy' : 'warning',
      lastSync: metrics?.cachedAt ? new Date(metrics.cachedAt).toLocaleTimeString('ru-RU') : 'Онлайн',
    },
    {
      name: 'not_completed',
      title: 'Не завершившие опрос',
      count: totalSheetsRows.not_completed ?? 0,
      status: (totalSheetsRows.not_completed ?? 0) > 0 ? 'healthy' : 'warning',
      lastSync: metrics?.cachedAt ? new Date(metrics.cachedAt).toLocaleTimeString('ru-RU') : 'Онлайн',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Welcome & Sync Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary tracking-tight">
            Сводная аналитика HURMO UZ
          </h1>
          <p className="text-xs text-secondary mt-0.5">
            Краткий обзор операционной воронки, динамики регистраций и состояния баз данных
          </p>
        </div>

        <button
          onClick={() => loadOverviewData(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-90 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Обновление...' : 'Синхронизировать'}</span>
        </button>
      </div>

      {/* 1. Top KPI Metrics (Clickable to /dashboard) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Ключевые показатели недели (переход в детализацию)
          </h2>
          <Link
            href="/dashboard"
            className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
          >
            <span>Вся воронка</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Calls */}
          <Link
            href="/dashboard"
            className="p-4 rounded-[8px] bg-surface border border-border/80 hover:border-accent hover:shadow-xs transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between text-secondary mb-2">
              <span className="text-xs font-medium">Звонки поддержки</span>
              <div className="p-1.5 rounded-[6px] bg-accent/10 text-accent group-hover:scale-110 transition-transform">
                <PhoneCall className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-primary tabular-nums">
              {loading ? '...' : callsVal.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-secondary mt-1 flex items-center gap-1">
              <span>За текущую неделю</span>
              <ArrowRight className="w-3 h-3 text-secondary group-hover:translate-x-0.5 transition-transform ml-auto" />
            </div>
          </Link>

          {/* Card 2: Registrations */}
          <Link
            href="/dashboard"
            className="p-4 rounded-[8px] bg-surface border border-border/80 hover:border-emerald-500 hover:shadow-xs transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between text-secondary mb-2">
              <span className="text-xs font-medium">Новые регистрации</span>
              <div className="p-1.5 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {loading ? '...' : registeredVal.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-secondary mt-1 flex items-center gap-1">
              <span>Пользователей в базе</span>
              <ArrowRight className="w-3 h-3 text-secondary group-hover:translate-x-0.5 transition-transform ml-auto" />
            </div>
          </Link>

          {/* Card 3: Declined */}
          <Link
            href="/dashboard"
            className="p-4 rounded-[8px] bg-surface border border-border/80 hover:border-rose-500 hover:shadow-xs transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between text-secondary mb-2">
              <span className="text-xs font-medium">Отказы и сбросы</span>
              <div className="p-1.5 rounded-[6px] bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {loading ? '...' : declinedVal.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-secondary mt-1 flex items-center gap-1">
              <span>Нет времени / отказ</span>
              <ArrowRight className="w-3 h-3 text-secondary group-hover:translate-x-0.5 transition-transform ml-auto" />
            </div>
          </Link>

          {/* Card 4: SMS Ratio */}
          <Link
            href="/dashboard"
            className="p-4 rounded-[8px] bg-surface border border-border/80 hover:border-amber-500 hover:shadow-xs transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between text-secondary mb-2">
              <span className="text-xs font-medium">Соотношение SMS</span>
              <div className="p-1.5 rounded-[6px] bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-primary tabular-nums">
              {loading
                ? '...'
                : smsVerification?.ratio !== undefined
                ? `${Math.round(smsVerification.ratio * 100)}%`
                : '—'}
            </div>
            <div className="text-[11px] text-secondary mt-1 flex items-center gap-1">
              <span className="truncate">{smsVerification?.statusText || 'numbers vs eskiz'}</span>
              <ArrowRight className="w-3 h-3 text-secondary group-hover:translate-x-0.5 transition-transform ml-auto shrink-0" />
            </div>
          </Link>
        </div>
      </section>

      {/* 2. Mini Anomaly Banner */}
      <section>
        {hasAnomaly ? (
          <div className="p-3.5 rounded-[8px] bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[6px] bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-primary">
                  Обнаружено аномальное отклонение метрик за текущую неделю
                </h3>
                <p className="text-[11px] text-secondary">
                  Показатели звонков или отказов отклонились от 4-недельной базы более чем на установленный порог
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-[6px] bg-amber-500 text-white hover:bg-amber-600 font-medium text-xs transition-colors self-start sm:self-center whitespace-nowrap"
            >
              Смотреть аномалии
            </Link>
          </div>
        ) : (
          <div className="px-3.5 py-2.5 rounded-[8px] bg-surface border border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-secondary">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-primary font-medium">Стабильность воронки:</span>
              <span>Все метрики находятся в пределах нормы (отклонения &lt; ±30%)</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-accent hover:underline font-medium hidden sm:inline-block"
            >
              Проверить базовые показатели
            </Link>
          </div>
        )}
      </section>

      {/* 3. Dynamics Chart */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-primary">
              Динамика регистраций респондентов
            </h2>
            <p className="text-[11px] text-secondary">
              Распределение добавления новых пользователей по дням и месяцам
            </p>
          </div>
          <Link
            href="/analytics"
            className="text-xs text-accent hover:underline flex items-center gap-1 font-medium self-start sm:self-auto"
          >
            <span>Подробный BI-анализ</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="h-56 w-full">
          {dynamicsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={DATA_PALETTE.data1} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={DATA_PALETTE.data1} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/50" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  className="text-secondary"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  className="text-secondary"
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                  formatter={(val: unknown) => [Number(val).toLocaleString('ru-RU'), 'Регистраций']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={DATA_PALETTE.data1}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#overviewGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-secondary">
              {loading ? 'Загрузка динамики...' : 'Нет данных динамики'}
            </div>
          )}
        </div>
      </section>

      {/* 4. Quick Links Showcase */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider">
          Разделы аналитической системы
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card: Dashboard */}
          <Link
            href="/dashboard"
            className="p-4 rounded-[8px] bg-surface border border-border/80 hover:border-accent hover:shadow-xs transition-all group flex items-start gap-3.5"
          >
            <div className="p-2.5 rounded-[8px] bg-accent/10 text-accent group-hover:scale-105 transition-transform shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                  Операционная воронка
                </h3>
                <ArrowRight className="w-4 h-4 text-secondary group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </div>
              <p className="text-xs text-secondary mt-1 line-clamp-2">
                Контроль звонков службы поддержки, верификация SMS-шлюза Eskiz, повторные контакты и выявление аномалий за выбранный период
              </p>
            </div>
          </Link>

          {/* Card: BI Analytics */}
          <Link
            href="/analytics"
            className="p-4 rounded-[8px] bg-surface border border-border/80 hover:border-accent hover:shadow-xs transition-all group flex items-start gap-3.5"
          >
            <div className="p-2.5 rounded-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  BI-аналитика
                </h3>
                <ArrowRight className="w-4 h-4 text-secondary group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
              <p className="text-xs text-secondary mt-1 line-clamp-2">
                Интерактивная демография респондентов: половозрастная пирамида, уровень образования, источники привлечения и кросс-фильтрация
              </p>
            </div>
          </Link>

          {/* Card: Map */}
          <Link
            href="/map"
            className="p-4 rounded-[8px] bg-surface border border-border/80 hover:border-accent hover:shadow-xs transition-all group flex items-start gap-3.5"
          >
            <div className="p-2.5 rounded-[8px] bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform shrink-0">
              <Map className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  Интерактивная карта регионов
                </h3>
                <ArrowRight className="w-4 h-4 text-secondary group-hover:text-sky-600 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
              <p className="text-xs text-secondary mt-1 line-clamp-2">
                Географическое распределение по 14 областям Узбекистана с цветовой тепловой картой и детализацией по районам при клике
              </p>
            </div>
          </Link>

          {/* Card: Raw Data */}
          <Link
            href="/raw"
            className="p-4 rounded-[8px] bg-surface border border-border/80 hover:border-accent hover:shadow-xs transition-all group flex items-start gap-3.5"
          >
            <div className="p-2.5 rounded-[8px] bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Сырые таблицы
                </h3>
                <ArrowRight className="w-4 h-4 text-secondary group-hover:text-purple-600 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
              <p className="text-xs text-secondary mt-1 line-clamp-2">
                Прямой просмотр и поиск по строкам всех 4 подключённых Google Таблиц с постраничной пагинацией и экспортом в CSV
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* 5. Data Health Indicator */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-secondary" />
            <h2 className="text-sm font-semibold text-primary">
              Здоровье подключённых баз данных
            </h2>
          </div>
          <Link
            href="/settings"
            className="text-xs text-secondary hover:text-primary hover:underline flex items-center gap-1"
          >
            <span>Настройки таблиц</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sheetsHealth.map((sheet) => (
            <div
              key={sheet.name}
              className="p-3 rounded-[6px] bg-neutral-50 dark:bg-surface-2/60 border border-border/60 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-primary">{sheet.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{sheet.status === 'healthy' ? 'В норме' : 'Внимание'}</span>
                </span>
              </div>
              <div className="text-[11px] text-secondary truncate">{sheet.title}</div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                <span className="text-secondary text-[11px]">Строк:</span>
                <span className="font-bold text-primary tabular-nums">
                  {sheet.count.toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
