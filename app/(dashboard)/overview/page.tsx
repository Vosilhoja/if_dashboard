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
  X,
  Search,
  Bot,
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
import { Skeleton } from '@/components/ui/Skeleton';
import { FunnelWidget } from '@/components/FunnelWidget';
import { AnomalyBanner } from '@/components/shared/AnomalyBanner';
import { OdometerNumber } from '@/components/ui/OdometerNumber';
import { motion } from 'framer-motion';

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
  const [showAnomalyBanner, setShowAnomalyBanner] = useState<boolean>(true);
  const [anomalyAlertsEnabled, setAnomalyAlertsEnabled] = useState<boolean>(true);

  useEffect(() => {
    try {
      const pref = localStorage.getItem('hurmo_show_anomaly_banner') ?? localStorage.getItem('hurmo_anomaly_notifications');
      if (pref !== null) {
        setAnomalyAlertsEnabled(pref === 'true');
      }
    } catch {
      // ignore in SSR
    }
  }, []);

  // Default week range for overview KPI
  const initialStart = formatDateToISO(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const initialEnd = formatDateToISO(endOfWeek(new Date(), { weekStartsOn: 1 }));

  const loadOverviewData = async (fresh = false) => {
    if (fresh) setRefreshing(true);
    else setLoading(true);

    try {
      const metricsUrl = `/api/proxy/data?startDate=${initialStart}&endDate=${initialEnd}${fresh ? '&fresh=true' : ''}`;
      const [metricsRes, analyticsRes] = await Promise.all([
        fetch(metricsUrl).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/proxy/data/analytics').then((r) => (r.ok ? r.json() : null)),
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

    let intervalId: NodeJS.Timeout | null = null;
    try {
      const saved = localStorage.getItem('hurmo_auto_refresh_interval');
      const minutes = saved !== null ? parseInt(saved, 10) : 3;
      if (minutes > 0) {
        intervalId = setInterval(() => {
          loadOverviewData(true);
        }, minutes * 60 * 1000);
      }
    } catch {
      // ignore in SSR
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
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
    <div className="space-y-6 sm:space-y-8">
      {/* ============================================================
          HERO СЕКЦИЯ В СТИЛЕ РЕФЕРЕНСА (Жирный заголовок + Поиск + Чипсы)
          ============================================================ */}
      {/* Header with Title and Sync Button */}
      <section className="pt-1 pb-1 space-y-3 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-primary tracking-tight">
              Сводный обзор дашборда
            </h1>
            <p className="text-[11px] text-secondary leading-relaxed max-w-2xl">
              Сквозной контроль 4 баз данных Google Sheets, операционная конверсия звонков операторов и статус респондентов по всему Узбекистану
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => loadOverviewData(true)}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs font-semibold border border-border transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-accent' : ''}`} />
            <span>{refreshing ? 'Синхронизация...' : 'Синхронизировать'}</span>
          </motion.button>
        </div>

        {/* Поисковый инпут в стиле референса */}
        <div
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-command-palette'));
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface-2/80 border border-border/80 text-secondary hover:text-primary hover:border-accent/40 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
        >
          <Search className="w-4 h-4 text-secondary/70 shrink-0" />
          <span className="text-xs text-secondary/70 flex-1 truncate">
            Номер телефона, область, статус звонка или имя...
          </span>
          <kbd className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-surface border border-border rounded-lg text-secondary">
            ⌘K
          </kbd>
        </div>

        {/* Чипсы быстрых фильтров в стиле референса (Быстрый поиск) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-secondary/80 font-medium mr-1 hidden xs:inline">Быстрый переход:</span>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-xl bg-surface-2/70 border border-border/70 hover:border-accent/40 text-xs font-semibold text-primary active:scale-95 transition-all shadow-xs"
          >
            Воронка звонков
          </Link>
          <Link
            href="/analytics"
            className="px-3 py-1.5 rounded-xl bg-surface-2/70 border border-border/70 hover:border-accent/40 text-xs font-semibold text-primary active:scale-95 transition-all shadow-xs"
          >
            BI-демография
          </Link>
          <Link
            href="/map"
            className="px-3 py-1.5 rounded-xl bg-surface-2/70 border border-border/70 hover:border-accent/40 text-xs font-semibold text-primary active:scale-95 transition-all shadow-xs"
          >
            14 регионов
          </Link>
          <Link
            href="/chat"
            className="px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/30 text-xs font-bold text-accent active:scale-95 transition-all shadow-xs flex items-center gap-1"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>ИИ-Ассистент</span>
          </Link>
        </div>
      </section>

      {/* 1. Top KPI Metrics (Clickable to /dashboard) */}
      <section className="space-y-3 animate-fade-in delay-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-black text-primary tracking-tight">
            Ключевые показатели недели
          </h2>
          <Link
            href="/dashboard"
            className="text-xs text-accent hover:underline flex items-center gap-1 font-bold"
          >
            <span>Вся воронка</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.03 },
            },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {/* Card 1: Calls */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
            }}
          >
            <Link
              href="/dashboard"
              className="p-4 rounded-[8px] bg-surface border border-border hover:border-accent/40 hover-lift group cursor-pointer block transition-colors"
            >
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-xs font-medium">Звонки поддержки</span>
                <PhoneCall className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
              </div>
              <div className="text-2xl font-bold text-primary tabular-nums">
                {loading ? '...' : <OdometerNumber value={callsVal} />}
              </div>
              <div className="text-[11px] text-secondary mt-1 flex items-center gap-1">
                <span>За текущую неделю</span>
                <ArrowRight className="w-3 h-3 text-secondary group-hover:translate-x-0.5 transition-transform ml-auto" />
              </div>
            </Link>
          </motion.div>

          {/* Card 2: Registrations */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
            }}
          >
            <Link
              href="/dashboard"
              className="p-4 rounded-[8px] bg-surface border border-border hover:border-accent/40 hover-lift group cursor-pointer block transition-colors"
            >
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-xs font-medium">Новые регистрации</span>
                <UserCheck className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
              </div>
              <div className="text-2xl font-bold text-primary tabular-nums">
                {loading ? '...' : <OdometerNumber value={registeredVal} />}
              </div>
              <div className="text-[11px] text-secondary mt-1 flex items-center gap-1">
                <span>Пользователей в базе</span>
                <ArrowRight className="w-3 h-3 text-secondary group-hover:translate-x-0.5 transition-transform ml-auto" />
              </div>
            </Link>
          </motion.div>

          {/* Card 3: Declined */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
            }}
          >
            <Link
              href="/dashboard"
              className="p-4 rounded-[8px] bg-surface border border-border hover:border-accent/40 hover-lift group cursor-pointer block transition-colors"
            >
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-xs font-medium">Отказы и сбросы</span>
                <UserX className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
              </div>
              <div className="text-2xl font-bold text-primary tabular-nums">
                {loading ? '...' : <OdometerNumber value={declinedVal} />}
              </div>
              <div className="text-[11px] text-secondary mt-1 flex items-center gap-1">
                <span>Нет времени / отказ</span>
                <ArrowRight className="w-3 h-3 text-secondary group-hover:translate-x-0.5 transition-transform ml-auto" />
              </div>
            </Link>
          </motion.div>

          {/* Card 4: SMS Ratio */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
            }}
          >
            <Link
              href="/dashboard"
              className="p-4 rounded-[8px] bg-surface border border-border hover:border-accent/40 hover-lift group cursor-pointer block transition-colors"
            >
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-xs font-medium">Соотношение SMS</span>
                <MessageSquare className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
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
          </motion.div>
        </motion.div>
      </section>

      {/* 2. Conversion Funnel */}
      <section className="animate-fade-in delay-150">
        <FunnelWidget
          callsCount={callsVal}
          linksSentCount={
            typeof metrics?.smsSentVerification?.value === 'number'
              ? metrics.smsSentVerification.value
              : Math.round(callsVal * 0.692)
          }
          registeredCount={registeredVal}
          loading={loading}
        />
      </section>

      {/* 3. Dynamics Chart */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 hover-lift animate-fade-in delay-250">
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="h-56 w-full"
        >
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
        </motion.div>
      </section>

      {/* 4. Quick Links Showcase */}
      <section className="space-y-4 animate-fade-in delay-300 pt-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Почему выбирают hurmouz
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Ключевые инструменты и модули для анализа колл-центра и базы респондентов
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card: Dashboard */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.12 }}>
            <Link
              href="/dashboard"
              className="p-4 rounded-[8px] bg-surface border border-border hover:border-accent/40 group flex items-start justify-between gap-3 block h-full transition-colors"
            >
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-secondary group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-primary group-hover:text-accent transition-colors">
                    Операционная воронка
                  </h3>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Контроль звонков службы поддержки, верификация SMS-шлюза Eskiz и выявление аномалий
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </Link>
          </motion.div>

          {/* Card: BI Analytics */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.12 }}>
            <Link
              href="/analytics"
              className="p-4 rounded-[8px] bg-surface border border-border hover:border-accent/40 group flex items-start justify-between gap-3 block h-full transition-colors"
            >
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-secondary group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-primary group-hover:text-accent transition-colors">
                    BI-аналитика
                  </h3>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Интерактивная демография: половозрастная пирамида, уровень образования и источники
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </Link>
          </motion.div>

          {/* Card: Map */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.12 }}>
            <Link
              href="/map"
              className="p-4 rounded-[8px] bg-surface border border-border hover:border-accent/40 group flex items-start justify-between gap-3 block h-full transition-colors"
            >
              <div className="flex items-start gap-3">
                <Map className="w-5 h-5 text-secondary group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-primary group-hover:text-accent transition-colors">
                    Интерактивная карта регионов
                  </h3>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Географическое распределение по 14 областям Узбекистана с детализацией по районам
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </Link>
          </motion.div>

          {/* Card: Raw Data */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.12 }}>
            <Link
              href="/raw"
              className="p-4 rounded-[8px] bg-surface border border-border hover:border-accent/40 group flex items-start justify-between gap-3 block h-full transition-colors"
            >
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-secondary group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-primary group-hover:text-accent transition-colors">
                    Сырые таблицы
                  </h3>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Прямой просмотр и поиск по строкам всех 4 подключённых Google Таблиц
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 4.5 System Anomaly Status Strip */}
      {anomalyAlertsEnabled && (
        <section className="animate-fade-in delay-300">
          <AnomalyBanner
            hasAnomaly={hasAnomaly}
            message={
              metrics?.anomalyData?.callsAnomaly.isAnomaly
                ? `Звонков на ${Math.abs(metrics.anomalyData.callsAnomaly.deltaPercent)}% ${metrics.anomalyData.callsAnomaly.direction === 'up' ? 'больше' : 'меньше'} нормы.`
                : metrics?.anomalyData?.declinedAnomaly.isAnomaly
                ? `Отказов на ${Math.abs(metrics?.anomalyData?.declinedAnomaly.deltaPercent || 0)}% ${metrics?.anomalyData?.declinedAnomaly.direction === 'up' ? 'больше' : 'меньше'} нормы.`
                : undefined
            }
          />
        </section>
      )}

      {/* 5. Data Health Indicator */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 hover-lift animate-fade-in delay-350">
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
              className="p-3 rounded-[6px] bg-surface-2/60 border border-border/60 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-primary">{sheet.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      sheet.status === 'healthy'
                        ? 'bg-emerald-500'
                        : 'bg-rose-500 animate-pulse'
                    }`}
                  />
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
