'use client';

import React from 'react';
import { AlertTriangle, LucideIcon } from 'lucide-react';
import { MetricValue } from '@/lib/types';

interface MetricCardProps {
  title: string;
  metric: MetricValue;
  icon: LucideIcon;
  colorClass?: string;
  badgeText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  metric,
  icon: Icon,
  colorClass = 'from-blue-600/20 to-indigo-600/10 border-blue-500/30 text-blue-400',
  badgeText,
}) => {
  const isAlert = metric.isAlert;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.02] shadow-xl backdrop-blur-sm ${
        isAlert
          ? 'bg-rose-950/30 border-rose-500/50 shadow-rose-950/20'
          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
      }`}
    >
      {/* Background ambient glow */}
      <div
        className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none ${
          isAlert ? 'bg-rose-500' : 'bg-indigo-500'
        }`}
      />

      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-center ${
            isAlert
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              : 'bg-slate-800/80 border-slate-700/60 text-indigo-400'
          }`}
        >
          {isAlert ? <AlertTriangle className="w-5 h-5 text-rose-400" /> : <Icon className="w-5 h-5" />}
        </div>
      </div>

      {metric.error ? (
        <div className="my-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{metric.error}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                isAlert ? 'text-rose-400' : 'text-white'
              }`}
            >
              {typeof metric.value === 'number'
                ? metric.value.toLocaleString('ru-RU')
                : metric.value}
            </span>
            {badgeText && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                {badgeText}
              </span>
            )}
          </div>

          {metric.statusText && (
            <div
              className={`text-xs font-semibold mt-1 inline-flex items-center gap-1.5 ${
                isAlert ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {metric.statusText}
            </div>
          )}

          {metric.subtext && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {metric.subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
