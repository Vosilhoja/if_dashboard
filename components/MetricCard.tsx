'use client';

import React from 'react';
import { LucideIcon, Info, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricValue } from '@/lib/types';

interface MetricCardProps {
  title: string;
  metric: MetricValue;
  icon?: LucideIcon;
  badgeText?: string;
  tooltipText?: string;
  /** Optional 7-point sparkline data (oldest→newest) */
  sparklineData?: number[];
  trend?: 'up' | 'down' | 'flat';
  trendPercent?: number;
  /** Optional stagger index for smooth sequential entrance animation */
  delayIndex?: number;
}

/** Minimal inline SVG sparkline */
function Sparkline({ data, isAlert }: { data: number[]; isAlert?: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 64;
  const H = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = isAlert ? '#f43f5e' : '#5B7FFF';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 opacity-80">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={parseFloat(pts[pts.length - 1].split(',')[0])}
        cy={parseFloat(pts[pts.length - 1].split(',')[1])}
        r="2"
        fill={color}
      />
    </svg>
  );
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  metric,
  icon: Icon,
  badgeText,
  tooltipText,
  sparklineData,
  trend,
  trendPercent,
  delayIndex = 0,
}) => {
  const isAlert = metric.isAlert;
  const isError = Boolean(metric.error);

  const trendIcon =
    trend === 'up' ? (
      <TrendingUp className="w-3 h-3" />
    ) : trend === 'down' ? (
      <TrendingDown className="w-3 h-3" />
    ) : (
      <Minus className="w-3 h-3" />
    );
  const trendColor =
    isAlert
      ? 'text-rose-500'
      : trend === 'up'
      ? 'text-emerald-500'
      : trend === 'down'
      ? 'text-rose-400'
      : 'text-secondary';

  return (
    <div
      style={{
        animationDelay: `${Math.min(delayIndex * 45, 450)}ms`,
        willChange: 'transform, opacity',
      }}
      className={`relative rounded-[10px] border p-4 hover-lift animate-fade-in flex flex-col gap-2 ${
        isAlert
          ? 'bg-rose-500/5 border-rose-500/40 text-rose-600 dark:text-rose-400'
          : 'bg-surface border-border hover:border-accent/40'
      }`}
    >
      {/* Top row: title + icon */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <div
              className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-110 ${
                isAlert ? 'bg-rose-500/10' : 'bg-accent/10'
              }`}
            >
              {isAlert ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Icon className="w-3.5 h-3.5 text-accent" />
              )}
            </div>
          )}
          <span className="text-xs font-medium text-secondary leading-tight">{title}</span>
          {tooltipText && (
            <div className="relative group/tooltip inline-block">
              <Info className="w-3 h-3 text-secondary/60 hover:text-accent cursor-help transition-colors" />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-surface text-[11px] text-primary rounded-[6px] border border-border shadow-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
                {tooltipText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
              </div>
            </div>
          )}
        </div>
        {badgeText && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border shrink-0">
            {badgeText}
          </span>
        )}
      </div>

      {/* Value + sparkline row */}
      {isError ? (
        <div className="p-2 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{metric.error}</span>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                isAlert ? 'text-rose-500' : 'text-primary'
              }`}
            >
              {typeof metric.value === 'number'
                ? metric.value.toLocaleString('ru-RU')
                : metric.value ?? '—'}
            </span>

            {/* Trend badge */}
            {(trend || trendPercent !== undefined) && (
              <div className={`inline-flex items-center gap-1 text-[11px] font-medium ${trendColor}`}>
                {trendIcon}
                {trendPercent !== undefined && (
                  <span>{trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(1)}%</span>
                )}
                {metric.statusText && <span className="ml-0.5">{metric.statusText}</span>}
              </div>
            )}
            {!trend && metric.statusText && (
              <div
                className={`text-[11px] font-medium mt-0.5 inline-flex items-center gap-1 ${
                  isAlert ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {metric.statusText}
              </div>
            )}

            {metric.subtext && (
              <p className="text-[11px] text-secondary mt-0.5 leading-tight">{metric.subtext}</p>
            )}
          </div>

          {/* Mini sparkline (idea 9) */}
          {sparklineData && <Sparkline data={sparklineData} isAlert={isAlert} />}
        </div>
      )}
    </div>
  );
};
