'use client';

import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatDateToISO } from '@/lib/date-utils';

export type FilterMode = 'week' | 'custom';

interface DateFilterProps {
  mode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  currentDate: Date;
  onCurrentDateChange: (date: Date) => void;
  startDate: string;
  endDate: string;
  onCustomRangeChange: (start: string, end: string, autoFetch?: boolean) => void;
  weekStartsOn?: 0 | 1;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  mode,
  onModeChange,
  currentDate,
  onCurrentDateChange,
  startDate,
  endDate,
  onCustomRangeChange,
  weekStartsOn = 1,
}) => {
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  // Helpers for week mode (configurable weekStartsOn)
  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn });

  const weekStartFormatted = format(weekStart, 'dd MMM yyyy', { locale: ru });
  const weekEndFormatted = format(weekEnd, 'dd MMM yyyy', { locale: ru });

  const handlePrevWeek = () => {
    const prev = subWeeks(currentDate, 1);
    onCurrentDateChange(prev);
    const start = startOfWeek(prev, { weekStartsOn });
    const end = endOfWeek(prev, { weekStartsOn });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
  };

  const handleNextWeek = () => {
    const next = addWeeks(currentDate, 1);
    onCurrentDateChange(next);
    const start = startOfWeek(next, { weekStartsOn });
    const end = endOfWeek(next, { weekStartsOn });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
  };

  const handleModeSwitch = (newMode: FilterMode) => {
    onModeChange(newMode);
    if (newMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn });
      const end = endOfWeek(currentDate, { weekStartsOn });
      onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
    }
  };

  // Fast Presets
  const applyPresetThisWeek = () => {
    onModeChange('week');
    const now = new Date();
    onCurrentDateChange(now);
    const start = startOfWeek(now, { weekStartsOn });
    const end = endOfWeek(now, { weekStartsOn });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
  };

  const applyPresetLastWeek = () => {
    onModeChange('week');
    const lastWeek = subWeeks(new Date(), 1);
    onCurrentDateChange(lastWeek);
    const start = startOfWeek(lastWeek, { weekStartsOn });
    const end = endOfWeek(lastWeek, { weekStartsOn });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
  };

  const applyPresetThisMonth = () => {
    onModeChange('custom');
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
  };

  return (
    <div className="bg-surface border border-border p-3 rounded-[8px] flex flex-col gap-2.5">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Mode toggler */}
        <div className="flex items-center bg-surface-2 p-0.5 rounded-[6px] border border-border self-start">
          <button
            onClick={() => handleModeSwitch('week')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-all cursor-pointer ${
              mode === 'week'
                ? 'bg-surface text-primary border border-border shadow-xs'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>По неделям</span>
          </button>
          <button
            onClick={() => handleModeSwitch('custom')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-all cursor-pointer ${
              mode === 'custom'
                ? 'bg-surface text-primary border border-border shadow-xs'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Произвольный период</span>
          </button>
        </div>

        {/* Week Selector */}
        {mode === 'week' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-[6px] bg-surface hover:bg-surface-2 text-secondary hover:text-primary border border-border transition-colors cursor-pointer"
              title="Предыдущая неделя"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-[6px] text-xs font-medium text-primary">
              <CalendarDays className="w-3.5 h-3.5 text-secondary shrink-0" />
              <span className="tabular-nums">
                {weekStartFormatted} — {weekEndFormatted}
              </span>
            </div>

            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-[6px] bg-surface hover:bg-surface-2 text-secondary hover:text-primary border border-border transition-colors cursor-pointer"
              title="Следующая неделя"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Custom Date Range Inputs - Desktop */}
        {mode === 'custom' && (
          <div className="hidden sm:flex items-center flex-wrap gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 bg-surface border border-border px-2.5 py-1.5 rounded-[6px]">
              <span className="text-secondary">С:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onCustomRangeChange(e.target.value, endDate, false)}
                className="bg-transparent text-primary focus:outline-none cursor-pointer tabular-nums"
              />
            </div>
            <span className="text-secondary">—</span>
            <div className="flex items-center gap-1.5 bg-surface border border-border px-2.5 py-1.5 rounded-[6px]">
              <span className="text-secondary">По:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onCustomRangeChange(startDate, e.target.value, false)}
                className="bg-transparent text-primary focus:outline-none cursor-pointer tabular-nums"
              />
            </div>
          </div>
        )}

        {/* Custom Date Range - Mobile Button trigger */}
        {mode === 'custom' && (
          <div className="sm:hidden">
            <button
              onClick={() => setMobileModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-surface border border-border rounded-[6px] text-xs text-primary"
            >
              <span className="tabular-nums">{startDate} — {endDate}</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-secondary" />
            </button>
          </div>
        )}
      </div>

      {/* Fast Presets Row */}
      <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-border text-xs">
        <span className="text-secondary flex items-center gap-1 text-[11px]">
          <Sparkles className="w-3 h-3 text-secondary" />
          Пресеты:
        </span>
        <button
          type="button"
          onClick={applyPresetThisWeek}
          className="px-2 py-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border transition-colors cursor-pointer text-xs"
        >
          Эта неделя
        </button>
        <button
          type="button"
          onClick={applyPresetLastWeek}
          className="px-2 py-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border transition-colors cursor-pointer text-xs"
        >
          Прошлая неделя
        </button>
        <button
          type="button"
          onClick={applyPresetThisMonth}
          className="px-2 py-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border transition-colors cursor-pointer text-xs"
        >
          Этот месяц
        </button>
      </div>

      {/* Fullscreen bottom-sheet modal on mobile for custom date picker */}
      {mobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:hidden">
          <div className="bg-surface border-t border-border rounded-t-[12px] p-4 space-y-3 animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-semibold text-primary">Выбор произвольного периода</h3>
              <button
                onClick={() => setMobileModalOpen(false)}
                className="p-1 text-secondary hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-secondary mb-1 text-[11px]">Дата начала (С):</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onCustomRangeChange(e.target.value, endDate, false)}
                  className="w-full bg-surface-2 border border-border px-3 py-2 rounded-[6px] text-primary text-xs focus:outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-secondary mb-1 text-[11px]">Дата окончания (По):</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onCustomRangeChange(startDate, e.target.value, false)}
                  className="w-full bg-surface-2 border border-border px-3 py-2 rounded-[6px] text-primary text-xs focus:outline-none tabular-nums"
                />
              </div>
            </div>

            <button
              onClick={() => setMobileModalOpen(false)}
              className="w-full py-2.5 rounded-[6px] bg-accent text-white font-medium text-xs"
            >
              Применить период
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
