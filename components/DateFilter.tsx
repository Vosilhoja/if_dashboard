'use client';

import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, CalendarDays, SlidersHorizontal, Sparkles } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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
  onCustomRangeChange: (start: string, end: string) => void;
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
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end));
  };

  const handleNextWeek = () => {
    const next = addWeeks(currentDate, 1);
    onCurrentDateChange(next);
    const start = startOfWeek(next, { weekStartsOn: 1 });
    const end = endOfWeek(next, { weekStartsOn: 1 });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end));
  };

  const handleModeSwitch = (newMode: FilterMode) => {
    onModeChange(newMode);
    if (newMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      onCustomRangeChange(formatDateToISO(start), formatDateToISO(end));
    }
  };

  // Fast Presets
  const applyPresetThisWeek = () => {
    onModeChange('week');
    const now = new Date();
    onCurrentDateChange(now);
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end));
  };

  const applyPresetLastWeek = () => {
    onModeChange('week');
    const lastWeek = subWeeks(new Date(), 1);
    onCurrentDateChange(lastWeek);
    const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
    const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end));
  };

  const applyPresetThisMonth = () => {
    onModeChange('custom');
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    onCustomRangeChange(formatDateToISO(start), formatDateToISO(end));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-3 lg:p-4 rounded-2xl flex flex-col gap-3 shadow-xl">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Mode toggler */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => handleModeSwitch('week')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'week'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>По неделям</span>
          </button>
          <button
            onClick={() => handleModeSwitch('custom')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'custom'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
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
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              title="Предыдущая неделя"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/70 rounded-xl text-xs sm:text-sm font-medium text-white shadow-inner">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              <span>
                {weekStartFormatted} — {weekEndFormatted}
              </span>
            </div>

            <button
              onClick={handleNextWeek}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              title="Следующая неделя"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Custom Date Range Inputs */}
        {mode === 'custom' && (
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400">С:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onCustomRangeChange(e.target.value, endDate)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              />
            </div>
            <span className="text-slate-500">—</span>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400">По:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onCustomRangeChange(startDate, e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Fast Presets Row */}
      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-800/60 text-xs">
        <span className="text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Быстрые пресеты:
        </span>
        <button
          type="button"
          onClick={applyPresetThisWeek}
          className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-colors cursor-pointer"
        >
          Эта неделя
        </button>
        <button
          type="button"
          onClick={applyPresetLastWeek}
          className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-colors cursor-pointer"
        >
          Прошлая неделя
        </button>
        <button
          type="button"
          onClick={applyPresetThisMonth}
          className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-colors cursor-pointer"
        >
          Этот месяц
        </button>
      </div>
    </div>
  );
};
