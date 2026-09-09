'use client';

import React from 'react';
import { Activity, RefreshCw, ExternalLink, Sliders } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated?: string;
  totalStats?: {
    main: number;
    numbers: number;
    eskiz: number;
  };
  settingsUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  lastUpdated,
  totalStats,
  settingsUrl,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xl tracking-wider">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                HURMO UZ
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Аналитический дашборд поддержки, SMS и регистраций пользователей
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {totalStats && (
            <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>База: <strong className="text-white">{totalStats.main.toLocaleString()}</strong></span>
              <span className="text-slate-600">•</span>
              <span>Звонки: <strong className="text-white">{totalStats.numbers.toLocaleString()}</strong></span>
              <span className="text-slate-600">•</span>
              <span>SMS: <strong className="text-white">{totalStats.eskiz.toLocaleString()}</strong></span>
            </div>
          )}

          {lastUpdated && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              Обновлено: {new Date(lastUpdated).toLocaleTimeString('ru-RU')}
            </span>
          )}

          {settingsUrl && (
            <a
              href={settingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
              title="Открыть лист settings в Google Sheets для редактирования статусов"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Изменить список статусов</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Очистить кэш и синхронизировать с Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isRefreshing ? 'Синхронизация...' : 'Обновить данные'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
