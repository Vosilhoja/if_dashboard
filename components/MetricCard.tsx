'use client';

import React from 'react';
import { LucideIcon, Info, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricValue } from '@/lib/types';
import { OdometerNumber } from '@/components/ui/OdometerNumber';

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

/** Rich inline SVG sparkline with gradient fill */
function RichSparkline({ data, isAlert }: { data: number[]; isAlert?: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 84;
  const H = 32;
  const padTop = 4;
  const padBottom = 4;
  const effectiveH = H - padTop - padBottom;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = padTop + effectiveH - ((v - min) / range) * effectiveH;
    return { x, y };
  });

  const polylineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const lastPt = pts[pts.length - 1];
  const areaPath = `M 0,${H} L ${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} L ${W},${H} Z`;

  const strokeColor = isAlert ? '#F43F5E' : '#3B82F6';
  const gradId = `spark-grad-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div className="shrink-0 flex items-center justify-end">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Shaded Area */}
        <path d={areaPath} fill={`url(#${gradId})`} />
        {/* Line */}
        <polyline
          points={polylineStr}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Current / Last Value Dot with Glow */}
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="3"
          fill={strokeColor}
          className="animate-pulse"
        />
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="5"
          fill={strokeColor}
          opacity="0.3"
        />
      </svg>
    </div>
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
      <TrendingUp className="w-3 h-3 shrink-0" />
    ) : trend === 'down' ? (
      <TrendingDown className="w-3 h-3 shrink-0" />
    ) : (
      <Minus className="w-3 h-3 shrink-0" />
    );

  const trendClass =
    isAlert
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25'
      : trend === 'up'
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
      : trend === 'down'
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25'
      : 'bg-surface-2 text-secondary border-border/80';

  return (
    <div
      style={{
        animationDelay: `${Math.min(delayIndex * 35, 300)}ms`,
      }}
      className={`group relative rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg animate-fade-in flex flex-col justify-between gap-3 ${
        isAlert
          ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50 hover:shadow-rose-500/10'
          : 'bg-surface border-border hover:border-accent/40 hover:shadow-accent/5'
      }`}
    >
      {/* Top row: Title + Icon + Tooltip */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isAlert
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/25'
                  : 'bg-surface-2 text-accent border border-border/80 group-hover:bg-accent group-hover:text-white group-hover:border-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold text-secondary leading-tight break-words [overflow-wrap:anywhere]">
            {title}
          </span>
          {tooltipText && (
            <div className="relative group/tooltip inline-block">
              <Info className="w-3.5 h-3.5 text-secondary/60 hover:text-accent cursor-help transition-colors" />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-surface text-[11px] text-primary rounded-xl border border-border shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
                {tooltipText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
              </div>
            </div>
          )}
        </div>

        {badgeText && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-2 text-secondary border border-border/80 shrink-0">
            {badgeText}
          </span>
        )}
      </div>

      {/* Main Value & Sparkline */}
      {isError ? (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate">{metric.error}</span>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3 pt-1">
          <div className="flex flex-col min-w-0">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                isAlert ? 'text-rose-500' : 'text-primary'
              }`}
            >
              {typeof metric.value === 'number' ? (
                <OdometerNumber value={metric.value} />
              ) : (
                metric.value ?? '—'
              )}
            </div>

            {/* Status / Ratio Text */}
            {metric.statusText && (
              <div
                className={`text-[11px] font-semibold mt-1 inline-flex items-center gap-1.5 ${
                  isAlert ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAlert ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
                  }`}
                />
                <span>{metric.statusText}</span>
              </div>
            )}
            {metric.diagnostics?.note && (
              <div className="mt-1 flex items-start gap-1 text-[11px] text-amber-500 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{metric.diagnostics.note}</span>
              </div>
            )}
          </div>

          {/* Sparkline Graphic */}
          {sparklineData && sparklineData.length >= 2 && (
            <RichSparkline data={sparklineData} isAlert={isAlert} />
          )}
        </div>
      )}

      {/* Bottom row: Trend badge & Subtext */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
        {trendPercent !== undefined ? (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold ${trendClass}`}
          >
            {trendIcon}
            <span>{trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(1)}%</span>
          </div>
        ) : (
          <div className="text-secondary font-mono text-[10px]">
            Talvera
          </div>
        )}

        {metric.subtext && (
          <span className="text-secondary/70 truncate text-right text-[11px]">
            {metric.subtext}
          </span>
        )}
      </div>
    </div>
  );
};
