'use client';

import React from 'react';
import { AlertTriangle, LucideIcon, Info } from 'lucide-react';
import { MetricValue } from '@/lib/types';

interface MetricCardProps {
  title: string;
  metric: MetricValue;
  icon: LucideIcon;
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
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:border-accent/40 shadow-sm ${
        isAlert
          ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400'
          : 'bg-surface border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
            {title}
          </span>
          {tooltipText && (
            <div className="relative group/tooltip inline-block">
              <Info className="w-3.5 h-3.5 text-secondary/70 hover:text-accent cursor-help transition-colors" />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-surface text-[11px] text-primary rounded-xl border border-border shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
                {tooltipText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
              </div>
            </div>
          )}
        </div>
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-center ${
            isAlert
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
              : 'bg-surface-2 border-border text-accent'
          }`}
        >
          {isAlert ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <Icon className="w-5 h-5" />}
        </div>
      </div>

      {isError ? (
        <div className="my-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{metric.error}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                isAlert ? 'text-rose-500' : 'text-primary'
              }`}
            >
              {typeof metric.value === 'number'
                ? metric.value.toLocaleString('ru-RU')
                : metric.value ?? '—'}
            </span>
            {badgeText && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-surface-2 text-secondary border border-border">
                {badgeText}
              </span>
            )}
          </div>

          {metric.statusText && (
            <div
              className={`text-xs font-semibold mt-1 inline-flex items-center gap-1.5 ${
                isAlert ? 'text-rose-500' : 'text-emerald-500'
              }`}
            >
              {metric.statusText}
            </div>
          )}

          {metric.subtext && (
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              {metric.subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
