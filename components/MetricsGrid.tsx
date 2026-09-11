'use client';

import React from 'react';
import {
  PhoneCall,
  MessageSquareCheck,
  UserCheck,
  Headset,
  Repeat,
  UserX,
  Bot,
  UsersRound,
} from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { Skeleton } from './ui/Skeleton';

interface MetricsGridProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-32 rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  // Extract trend data from anomaly metrics for sparklines (idea 9)
  const callsAnomaly = metrics.anomalyData?.callsAnomaly;
  const declinedAnomaly = metrics.anomalyData?.declinedAnomaly;

  // Build a simulated sparkline from baseline + current (7 points trending from baseline→current)
  function buildSparkline(baseline: number | undefined, current: number): number[] {
    if (!baseline || baseline <= 0) return [];
    const delta = current - baseline;
    // Use a seeded approach so sparkline is stable (not random on re-render)
    const jitter = [0.02, -0.04, 0.06, -0.02, 0.05, -0.03, 0];
    return Array.from({ length: 7 }, (_, i) => {
      const progress = i / 6;
      return Math.max(0, Math.round(baseline + delta * progress + baseline * jitter[i]));
    });
  }

  const callsSparkline = buildSparkline(
    callsAnomaly?.baseline4WeeksAvg,
    typeof metrics.callsCount?.value === 'number' ? metrics.callsCount.value : 0
  );
  const declinedSparkline = buildSparkline(
    declinedAnomaly?.baseline4WeeksAvg,
    typeof metrics.declinedCount?.value === 'number' ? metrics.declinedCount.value : 0
  );

  const callsDelta = callsAnomaly?.deltaPercent ?? undefined;
  const callsTrend: 'up' | 'down' | 'flat' | undefined =
    callsDelta !== undefined ? (callsDelta > 3 ? 'up' : callsDelta < -3 ? 'down' : 'flat') : undefined;

  const declinedDelta = declinedAnomaly?.deltaPercent ?? undefined;
  const declinedTrend: 'up' | 'down' | 'flat' | undefined =
    declinedDelta !== undefined ? (declinedDelta > 3 ? 'up' : declinedDelta < -3 ? 'down' : 'flat') : undefined;

  return (
    <div className="space-y-3">
      {/* 8+ Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="1. Звонков операторов"
          metric={metrics.callsCount}
          icon={PhoneCall}
          badgeText="numbers"
          sparklineData={callsSparkline.length >= 2 ? callsSparkline : undefined}
          trend={callsTrend}
          trendPercent={callsDelta}
          delayIndex={0}
        />
        <MetricCard
          title="2. SMS (сверка)"
          metric={metrics.smsSentVerification}
          icon={MessageSquareCheck}
          badgeText="numbers / eskiz"
          tooltipText="X ссылок отправлено по данным numbers / Y SMS реально отправлено по Eskiz (DELIVERED+ACCEPTED)"
          delayIndex={1}
        />
        <MetricCard
          title="3. Регистраций в панели"
          metric={metrics.registeredMainBase}
          icon={UserCheck}
          badgeText="main_base"
          delayIndex={2}
        />
        <MetricCard
          title="4. От поддержки"
          metric={metrics.registeredFromSupport}
          icon={Headset}
          badgeText="numbers → base"
          tooltipText="Уникальные абоненты из таблицы numbers, найденные среди зарегистрированных в main_base"
          delayIndex={3}
        />
        <MetricCard
          title="5. После повторной ссылки"
          metric={metrics.registeredAfterRepeat}
          icon={Repeat}
          badgeText="повторно"
          delayIndex={4}
        />
        <MetricCard
          title="6. Отказы респондентов"
          metric={metrics.declinedCount}
          icon={UserX}
          badgeText="otkaz / vaqti yo'q"
          tooltipText="Отказы, отсутствие времени, сбросы звонков оператора (более 13k в общей базе)"
          sparklineData={declinedSparkline.length >= 2 ? declinedSparkline : undefined}
          trend={declinedTrend}
          trendPercent={declinedDelta}
          delayIndex={5}
        />
        <MetricCard
          title="7. Уже через бот"
          metric={metrics.alreadyRegisteredCount}
          icon={Bot}
          badgeText="bot bor"
          tooltipText="Абоненты, которые сообщили, что уже зарегистрировались или пользуются Telegram-ботом"
          delayIndex={6}
        />
        <MetricCard
          title="8. Не тот человек / номер"
          metric={metrics.wrongPersonCount}
          icon={UsersRound}
          badgeText="boshqa odam"
          tooltipText="Зарегистрированы с другого номера, чужой номер, второй номер"
          delayIndex={7}
        />
        {metrics.notCompletedCount && (
          <MetricCard
            title="9. Не завершили регистрацию"
            metric={metrics.notCompletedCount}
            badgeText="not_completed"
            tooltipText="Пользователи, начавшие регистрацию в период, но не завершившие её (Not completed)"
            delayIndex={8}
          />
        )}
      </div>

      {/* Diagnostics summary strip with mini-horizontal bar indicators */}
      {metrics.phoneDiagnostics && (() => {
        const d = metrics.phoneDiagnostics;
        const total = (d.corrupted || 0) + (d.truncated || 0) + (d.invalid || 0) + (d.foreign || 0) || 1;
        const pCorrupted = Math.min(100, Math.round(((d.corrupted || 0) / total) * 100));
        const pTruncated = Math.min(100, Math.round(((d.truncated || 0) / total) * 100));
        const pInvalid = Math.min(100, Math.round(((d.invalid || 0) / total) * 100));
        const pForeign = Math.min(100, Math.round(((d.foreign || 0) / total) * 100));

        return (
          <div className="bg-surface border border-border rounded-[8px] p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-secondary">
            <span className="font-semibold text-primary shrink-0">
              Качество номеров:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 flex-1 max-w-2xl">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Научная нотация:</span>
                  <strong className="text-amber-500 font-semibold tabular-nums">{d.corrupted}</strong>
                </div>
                <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${pCorrupted}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Обрезаны:</span>
                  <strong className="text-rose-500 font-semibold tabular-nums">{d.truncated}</strong>
                </div>
                <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full transition-all duration-300" style={{ width: `${pTruncated}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Мусор / &le;8:</span>
                  <strong className="text-primary font-semibold tabular-nums">{d.invalid}</strong>
                </div>
                <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all duration-300" style={{ width: `${pInvalid}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Иностранные:</span>
                  <strong className="text-accent font-semibold tabular-nums">{d.foreign}</strong>
                </div>
                <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pForeign}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
