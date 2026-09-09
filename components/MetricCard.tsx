'use client';

import React from 'react';
import { LucideIcon, Info, AlertTriangle } from 'lucide-react';
import { MetricValue } from '@/lib/types';

interface MetricCardProps {
  title: string;
  metric: MetricValue;
  icon?: LucideIcon;
  badgeText?: string;
  tooltipText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  metric,
  icon: Icon,
  badgeText,
  tooltipText,
}) => {
  const isAlert = metric.isAlert;
  const isError = Boolean(metric.error);

  return (
    <div
      className={`relative rounded-[8px] border p-3.5 transition-colors ${
        isAlert
          ? 'bg-rose-500/5 border-rose-500/40 text-rose-600 dark:text-rose-400'
          : 'bg-surface border-border hover:border-border/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-secondary">
            {title}
          </span>
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

        {/* Small monochrome icon without box background */}
        {isAlert ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        ) : Icon ? (
          <Icon className="w-3.5 h-3.5 text-secondary/70 shrink-0" />
        ) : null}
      </div>

      {isError ? (
        <div className="my-1.5 p-2 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{metric.error}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-semibold tracking-tight tabular-nums ${
                isAlert ? 'text-rose-500' : 'text-primary'
              }`}
            >
              {typeof metric.value === 'number'
                ? metric.value.toLocaleString('ru-RU')
                : metric.value ?? '—'}
            </span>
            {badgeText && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border">
                {badgeText}
              </span>
            )}
          </div>

          {metric.statusText && (
            <div
              className={`text-[11px] font-medium mt-0.5 inline-flex items-center gap-1 ${
                isAlert ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {metric.statusText}
            </div>
          )}

          {metric.subtext && (
            <p className="text-[11px] text-secondary mt-0.5 leading-tight">
              {metric.subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
