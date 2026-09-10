'use client';

import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle2, PhoneCall, UserX } from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';

interface AnomalyWidgetProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export const AnomalyWidget: React.FC<AnomalyWidgetProps> = ({ metrics, loading }) => {
  const [threshold, setThreshold] = React.useState<number>(30);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('hurmo_anomaly_threshold');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0) setThreshold(val);
      }
    } catch {
      // ignore in SSR
    }
  }, []);

  if (loading || !metrics || !metrics.anomalyData) {
    return null;
  }

  const { callsAnomaly, declinedAnomaly } = metrics.anomalyData;
  const isCallsAnomaly = Math.abs(callsAnomaly.deltaPercent) >= threshold;
  const isDeclinedAnomaly = Math.abs(declinedAnomaly.deltaPercent) >= threshold;
  const hasAnyAnomaly = isCallsAnomaly || isDeclinedAnomaly;

  return (
    <div
      className={`rounded-[8px] border p-3.5 transition-all ${
        hasAnyAnomaly
          ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-500/10'
          : 'bg-surface border-border'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          {hasAnyAnomaly ? (
            <div className="p-1 rounded-[4px] bg-amber-500/20 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1 rounded-[4px] bg-emerald-500/20 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <span>Аномалии за период</span>
              {hasAnyAnomaly && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                  Отклонение &gt; ±{threshold}%
                </span>
              )}
            </h3>
            <p className="text-[10px] text-secondary">
              Сравнение метрик звонков и отказов со средним за предыдущие 4 недели тех же дней недели
            </p>
          </div>
        </div>

        {!hasAnyAnomaly && (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 self-start sm:self-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>В пределах нормы</span>
          </span>
        )}
      </div>

      {/* Anomaly Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
        {/* Metric 1: Calls Anomaly */}
        <div
          className={`p-2.5 rounded-[6px] border flex items-start justify-between gap-3 ${
            callsAnomaly.isAnomaly
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-surface-2/60 border-border/50'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <PhoneCall className="w-3.5 h-3.5 text-accent" />
              <span className="font-medium text-primary">1. Звонки операторов</span>
            </div>
            <div className="text-sm font-bold text-primary tabular-nums">
              {callsAnomaly.current.toLocaleString()}{' '}
              <span className="text-[11px] font-normal text-secondary">
                (база 4 нед.: {callsAnomaly.baseline4WeeksAvg.toLocaleString()})
              </span>
            </div>
            <p className="text-[11px] text-secondary">
              {callsAnomaly.deltaPercent === 0
                ? 'На уровне среднего показателя'
                : `Звонков на ${Math.abs(callsAnomaly.deltaPercent)}% ${
                    callsAnomaly.direction === 'up' ? 'больше' : 'меньше'
                  } обычного для этого периода`}
            </p>
          </div>

          <div
            className={`flex items-center gap-0.5 px-2 py-1 rounded-[4px] text-xs font-semibold tabular-nums shrink-0 ${
              callsAnomaly.direction === 'up'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : callsAnomaly.direction === 'down'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-surface-2 text-secondary'
            }`}
          >
            {callsAnomaly.direction === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : callsAnomaly.direction === 'down' ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : null}
            <span>
              {callsAnomaly.deltaPercent > 0 ? `+${callsAnomaly.deltaPercent}%` : `${callsAnomaly.deltaPercent}%`}
            </span>
          </div>
        </div>

        {/* Metric 6: Declined Anomaly */}
        <div
          className={`p-2.5 rounded-[6px] border flex items-start justify-between gap-3 ${
            declinedAnomaly.isAnomaly
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-surface-2/60 border-border/50'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <UserX className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-medium text-primary">6. Отказы респондентов</span>
            </div>
            <div className="text-sm font-bold text-primary tabular-nums">
              {declinedAnomaly.current.toLocaleString()}{' '}
              <span className="text-[11px] font-normal text-secondary">
                (база 4 нед.: {declinedAnomaly.baseline4WeeksAvg.toLocaleString()})
              </span>
            </div>
            <p className="text-[11px] text-secondary">
              {declinedAnomaly.deltaPercent === 0
                ? 'На уровне среднего показателя'
                : `Отказов на ${Math.abs(declinedAnomaly.deltaPercent)}% ${
                    declinedAnomaly.direction === 'up' ? 'больше' : 'меньше'
                  } обычного для этого периода`}
            </p>
          </div>

          <div
            className={`flex items-center gap-0.5 px-2 py-1 rounded-[4px] text-xs font-semibold tabular-nums shrink-0 ${
              declinedAnomaly.direction === 'up'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : declinedAnomaly.direction === 'down'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-surface-2 text-secondary'
            }`}
          >
            {declinedAnomaly.direction === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : declinedAnomaly.direction === 'down' ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : null}
            <span>
              {declinedAnomaly.deltaPercent > 0 ? `+${declinedAnomaly.deltaPercent}%` : `${declinedAnomaly.deltaPercent}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
