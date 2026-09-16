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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardMetrics } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { Skeleton } from './ui/Skeleton';

interface MetricsGridProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
  attemptFilter?: string;
  onAttemptFilterChange?: (value: string) => void;
  attemptRegion?: string;
  attemptStatus?: string;
  onAttemptRegionChange?: (value: string) => void;
  onAttemptStatusChange?: (value: string) => void;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  metrics,
  loading,
  attemptFilter = 'all',
  onAttemptFilterChange,
  attemptRegion = 'all',
  attemptStatus = 'all',
  onAttemptRegionChange,
  onAttemptStatusChange,
}) => {
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

  const regionChartData = (metrics.surveyAttemptDetails?.regions ?? [])
    .slice()
    .sort((a, b) => (b.people ?? 0) - (a.people ?? 0))
    .map((region) => ({
      name: region.region,
      people: region.people,
      attempts: region.attempts,
    }));

  const statusChartData = (metrics.surveyAttemptDetails?.statuses ?? [])
    .slice()
    .map((item) => ({
      name: item.status,
      count: item.count,
    }));

  const attemptsDistributionData = Object.entries(metrics.surveyAttemptDetails?.distribution ?? {})
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort((a, b) => Number(a.label === '4+') - Number(b.label === '4+'));

  const formatChartValue = (value: string | number | ReadonlyArray<string | number> | undefined) => {
    if (Array.isArray(value)) {
      return value.map((item) => Number(item ?? 0).toLocaleString('ru-RU')).join(', ');
    }

    return Number(value ?? 0).toLocaleString('ru-RU');
  };

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
          tooltipText="Уникальные пользователи из main_base, которым звонили из поддержки за выбранный период. Для неоднозначного статуса система проверяет дату регистрации: день звонка или следующие 3 дня считаются результатом звонка, регистрация до звонка исключается. При отсутствии даты регистрация не засчитывается."
          delayIndex={3}
        />
        <MetricCard
          title="5. Повторные звонки"
          metric={metrics.repeatContactsCount}
          icon={Repeat}
          badgeText="повторно"
          tooltipText="Количество звонков, отмеченных как повторный контакт, за выбранный период"
          delayIndex={4}
        />
        <MetricCard
          title="6. Пользователи после повторного звонка"
          metric={metrics.registeredAfterRepeat}
          icon={UserCheck}
          badgeText="повторно → регистрация"
          tooltipText="Уникальные пользователи, зарегистрировавшиеся в день повторного звонка или позже, при повторном контакте за выбранный период"
          delayIndex={5}
        />
        <MetricCard
          title="7. Отказы респондентов"
          metric={metrics.declinedCount}
          icon={UserX}
          badgeText="otkaz / vaqti yo'q"
          tooltipText="Отказы, отсутствие времени, сбросы звонков оператора (более 13k в общей базе)"
          sparklineData={declinedSparkline.length >= 2 ? declinedSparkline : undefined}
          trend={declinedTrend}
          trendPercent={declinedDelta}
          delayIndex={6}
        />
        <MetricCard
          title="8. Уже через бот"
          metric={metrics.alreadyRegisteredCount}
          icon={Bot}
          badgeText="bot bor"
          tooltipText="Абоненты, которые сообщили, что уже зарегистрировались или пользуются Telegram-ботом"
          delayIndex={7}
        />
        <MetricCard
          title="9. Не тот человек / номер"
          metric={metrics.wrongPersonCount}
          icon={UsersRound}
          badgeText="boshqa odam"
          tooltipText="Зарегистрированы с другого номера, чужой номер, второй номер"
          delayIndex={8}
        />
        {metrics.notCompletedCount && (
          <MetricCard
            title="10. Не завершили регистрацию"
            metric={metrics.notCompletedCount}
            badgeText="not_completed"
            tooltipText="Пользователи, начавшие регистрацию в период, но не завершившие её (Not completed)"
            delayIndex={9}
          />
        )}
      </div>

      {metrics.surveyAttemptDetails && (
        <div className="rounded-[10px] border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold text-primary">Попытки прохождения по регионам</h3>
              <p className="text-[11px] text-secondary">
                Синхронизировано с периодом, количеством попыток, регионом и статусом
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={attemptFilter}
                onChange={(event) => onAttemptFilterChange?.(event.target.value)}
                className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-primary"
                aria-label="Фильтр количества попыток"
              >
                <option value="all">Все люди</option>
                <option value="1">Ровно 1 попытка</option>
                <option value="2">Ровно 2 попытки</option>
                <option value="3">Ровно 3 попытки</option>
                <option value="4+">4 и более</option>
              </select>
              <select
                value={attemptRegion}
                onChange={(event) => onAttemptRegionChange?.(event.target.value)}
                className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-primary"
                aria-label="Фильтр региона попыток"
              >
                <option value="all">Все регионы</option>
                {metrics.surveyAttemptDetails.regions.map((region) => (
                  <option key={region.region} value={region.region.toLowerCase()}>
                    {region.region}
                  </option>
                ))}
              </select>
              <select
                value={attemptStatus}
                onChange={(event) => onAttemptStatusChange?.(event.target.value)}
                className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-primary"
                aria-label="Фильтр статуса попыток"
              >
                <option value="all">Все статусы</option>
                {metrics.surveyAttemptDetails.statuses.map((item) => (
                  <option key={item.status} value={item.status.toLowerCase()}>
                    {item.status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {metrics.surveyAttemptDetails.regions.map((region) => (
              <div key={region.region} className="rounded-md bg-surface-2 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-primary truncate">{region.region}</div>
                  <div className="text-lg font-bold tabular-nums text-accent">{region.people.toLocaleString('ru-RU')}</div>
                </div>
                <div className="text-[10px] text-secondary">{region.attempts.toLocaleString('ru-RU')} попыток</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.max(
                        4,
                        Math.round(
                          (region.people /
                            Math.max(1, metrics.surveyAttemptDetails?.regions[0]?.people || 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {metrics.surveyAttemptDetails.statuses.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-primary">Статусы попыток</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {metrics.surveyAttemptDetails.statuses.map((item) => {
                  const max = metrics.surveyAttemptDetails?.statuses[0]?.count || 1;
                  const width = Math.max(4, Math.round((item.count / max) * 100));
                  return (
                    <div key={item.status} className="rounded-md bg-surface-2 px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-secondary">{item.status}</span>
                        <strong className="tabular-nums text-primary">{item.count.toLocaleString('ru-RU')}</strong>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border/60">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pt-1">
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <div className="mb-2 text-[11px] font-semibold text-primary">Регионы по числу людей</div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={formatChartValue} />
                    <Bar dataKey="people" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface-2 p-3">
              <div className="mb-2 text-[11px] font-semibold text-primary">Статусы по количеству попыток</div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={formatChartValue} />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {attemptsDistributionData.length > 0 && (
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <div className="mb-2 text-[11px] font-semibold text-primary">Распределение по количеству попыток</div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attemptsDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={formatChartValue} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

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
