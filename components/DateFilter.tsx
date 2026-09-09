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
}

export const DateFilter: React.FC<DateFilterProps> = ({
  mode,
  onModeChange,
  currentDate,
  onCurrentDateChange,
  startDate,
  endDate,
  onCustomRangeChange,
}) => {
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  // Helpers for week mode (Monday start)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const weekStartFormatted = format(weekStart, 'dd MMM yyyy', { locale: ru });
  const weekEndFormatted = format(weekEnd, 'dd MMM yyyy', { locale: ru });

  const handlePrevWeek = () => {
    const prev = subWeeks(currentDate, 1);
    onCurrentDateChange(prev);
    const start = startOfWeek(prev, { weekStartsOn: 1 });
    const end = endOfWeek(prev, { weekStartsOn: 1 });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
  };

  const handleNextWeek = () => {
    const next = addWeeks(currentDate, 1);
    onCurrentDateChange(next);
    const start = startOfWeek(next, { weekStartsOn: 1 });
    const end = endOfWeek(next, { weekStartsOn: 1 });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
  };

  const handleModeSwitch = (newMode: FilterMode) => {
    onModeChange(newMode);
    if (newMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
    }
  };

  // Fast Presets
  const applyPresetThisWeek = () => {
    onModeChange('week');
    const now = new Date();
    onCurrentDateChange(now);
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end), true);
  };

  const applyPresetLastWeek = () => {
    onModeChange('week');
    const lastWeek = subWeeks(new Date(), 1);
    onCurrentDateChange(lastWeek);
    const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
    const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
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
    <div className="bg-surface border border-border p-3 lg:p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Mode toggler */}
        <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-border self-start">
          <button
            onClick={() => handleModeSwitch('week')}
            className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'week'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>По неделям</span>
          </button>
          <button
            onClick={() => handleModeSwitch('custom')}
            className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'custom'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Произвольный период</span>
          </button>
        </div>

        {/* Week Selector */}
        {mode === 'week' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border transition-colors cursor-pointer"
              title="Предыдущая неделя"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-surface-2/80 border border-border rounded-xl text-xs sm:text-sm font-medium text-primary shadow-inner">
              <CalendarDays className="w-4 h-4 text-accent shrink-0" />
              <span>
                {weekStartFormatted} — {weekEndFormatted}
              </span>
            </div>

            <button
              onClick={handleNextWeek}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border transition-colors cursor-pointer"
              title="Следующая неделя"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Custom Date Range Inputs - Desktop */}
        {mode === 'custom' && (
          <div className="hidden sm:flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 bg-surface-2 border border-border px-3 py-2 min-h-[44px] rounded-xl">
              <span className="text-secondary">С:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onCustomRangeChange(e.target.value, endDate, false)}
                className="bg-transparent text-primary focus:outline-none cursor-pointer"
              />
            </div>
            <span className="text-secondary">—</span>
            <div className="flex items-center gap-2 bg-surface-2 border border-border px-3 py-2 min-h-[44px] rounded-xl">
              <span className="text-secondary">По:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onCustomRangeChange(startDate, e.target.value, false)}
                className="bg-transparent text-primary focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Custom Date Range - Mobile Button trigger */}
        {mode === 'custom' && (
          <div className="sm:hidden">
            <button
              onClick={() => setMobileModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2.5 min-h-[44px] bg-surface-2 border border-border rounded-xl text-xs text-primary"
            >
              <span>Диапазон: {startDate} — {endDate}</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
            </button>
          </div>
        )}
      </div>

      {/* Fast Presets Row */}
      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-border text-xs">
        <span className="text-secondary flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          Быстрые пресеты:
        </span>
        <button
          type="button"
          onClick={applyPresetThisWeek}
          className="px-3 py-1.5 min-h-[36px] rounded-lg bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border transition-colors cursor-pointer"
        >
          Эта неделя
        </button>
        <button
          type="button"
          onClick={applyPresetLastWeek}
          className="px-3 py-1.5 min-h-[36px] rounded-lg bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border transition-colors cursor-pointer"
        >
          Прошлая неделя
        </button>
        <button
          type="button"
          onClick={applyPresetThisMonth}
          className="px-3 py-1.5 min-h-[36px] rounded-lg bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border transition-colors cursor-pointer"
        >
          Этот месяц
        </button>
      </div>

      {/* Fullscreen bottom-sheet modal on mobile for custom date picker */}
      {mobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:hidden">
          <div className="bg-surface border-t border-border rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-primary">Выбор произвольного периода</h3>
              <button
                onClick={() => setMobileModalOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-secondary mb-1">Дата начала (С):</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onCustomRangeChange(e.target.value, endDate, false)}
                  className="w-full bg-surface-2 border border-border px-4 py-3 min-h-[44px] rounded-xl text-primary text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-secondary mb-1">Дата окончания (По):</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onCustomRangeChange(startDate, e.target.value, false)}
                  className="w-full bg-surface-2 border border-border px-4 py-3 min-h-[44px] rounded-xl text-primary text-sm focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setMobileModalOpen(false);
              }}
              className="w-full py-3 min-h-[44px] rounded-xl bg-accent text-white font-bold text-xs shadow-md"
            >
              Применить период
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
