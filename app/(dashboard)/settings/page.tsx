'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ExternalLink,
  Table,
  KeyRound,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Database,
  SlidersHorizontal,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

interface SheetInfo {
  key: string;
  name: string;
  title: string;
  url: string;
  sheetId: string;
  rowsCount?: number;
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  const [settingsUrl, setSettingsUrl] = useState<string>('');
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Anomaly threshold in localStorage
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(30);
  const [isSavedThreshold, setIsSavedThreshold] = useState<boolean>(false);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    // Load anomaly threshold from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hurmo_anomaly_threshold');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0) {
          setAnomalyThreshold(val);
        }
      }
    }

    // Load sheets info and settings link
    async function loadSettingsData() {
      try {
        setLoading(true);
        const [settingsRes, metricsRes] = await Promise.all([
          fetch('/api/settings').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/metrics').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (settingsRes?.settingsUrl) {
          setSettingsUrl(settingsRes.settingsUrl);
        }

        const totalRows = metricsRes?.totalRows || {};
        if (settingsRes?.sheets) {
          const mappedSheets = settingsRes.sheets.map((s: SheetInfo) => ({
            ...s,
            rowsCount: totalRows[s.key] ?? undefined,
          }));
          setSheets(mappedSheets);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить параметры');
      } finally {
        setLoading(false);
      }
    }

    loadSettingsData();
  }, []);

  const handleSaveThreshold = (newVal: number) => {
    setAnomalyThreshold(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_anomaly_threshold', newVal.toString());
      setIsSavedThreshold(true);
      setTimeout(() => setIsSavedThreshold(false), 2000);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/login', { method: 'DELETE' });
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-primary tracking-tight">Настройки системы</h1>
        <p className="text-xs text-secondary mt-0.5">
          Управление внешними Google Таблицами, порогами аномалий и параметрами сессии
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Status Settings Link (Google Sheets Tab) */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Настройки статусов воронки</h2>
        </div>
        <p className="text-xs text-secondary">
          Правила сопоставления статусов звонков, категорий отказов и повторных контактов настраиваются во вкладке Google Таблицы:
        </p>

        {settingsUrl ? (
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[6px] bg-accent text-white hover:opacity-95 text-xs font-medium transition-all shadow-xs cursor-pointer"
          >
            <span>Открыть настройки статусов в Google Таблицах</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <div className="text-xs text-secondary italic">Загрузка ссылки...</div>
        )}
      </section>

      {/* 2. Connected Google Sheets Info Cards */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Подключённые Google Таблицы</h2>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>4 таблицы подключено</span>
          </span>
        </div>
        <p className="text-xs text-secondary">
          Прямой доступ к исходным базам данных для проверки и отладки:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {sheets.map((sheet) => (
            <div
              key={sheet.key}
              className="p-3.5 rounded-[6px] bg-neutral-50 dark:bg-surface-2/60 border border-border/60 flex flex-col justify-between space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-primary">{sheet.name}</span>
                  <div className="text-[11px] text-secondary mt-0.5">{sheet.title}</div>
                </div>
                {sheet.rowsCount !== undefined && (
                  <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-surface border border-border font-medium tabular-nums text-primary">
                    {sheet.rowsCount.toLocaleString('ru-RU')} строк
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-[10px] text-secondary font-mono truncate max-w-[140px]">
                  ID: {sheet.sheetId.slice(0, 12)}...
                </span>
                <a
                  href={sheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:underline cursor-pointer"
                >
                  <span>Открыть таблицу</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Anomaly Threshold Setting */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Порог чувствительности аномалий</h2>
          </div>
          {isSavedThreshold && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Сохранено</span>
            </span>
          )}
        </div>
        <p className="text-xs text-secondary">
          Метрики звонков и отказов помечаются как аномальные, если их отклонение от 4-недельной базы превышает заданный процент.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={anomalyThreshold}
              onChange={(e) => handleSaveThreshold(parseInt(e.target.value, 10))}
              className="flex-1 accent-accent cursor-pointer"
            />
            <span className="font-bold text-sm text-primary tabular-nums w-12 text-right">
              ±{anomalyThreshold}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[20, 30, 40, 50].map((preset) => (
              <button
                key={preset}
                onClick={() => handleSaveThreshold(preset)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer border ${
                  anomalyThreshold === preset
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
                }`}
              >
                ±{preset}%
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Password Change Guidance */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Смена пароля дашборда</h2>
        </div>
        <p className="text-xs text-secondary">
          В проекте используется единый безопасный токен авторизации команды.
        </p>

        <div className="p-3 rounded-[6px] bg-neutral-50 dark:bg-surface-2/60 border border-border/60 text-xs text-secondary space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium text-primary">
            <Info className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Инструкция по смене пароля:</span>
          </div>
          <p>
            Для смены пароля измените значение переменной{' '}
            <code className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-primary text-[11px]">
              DASHBOARD_PASSWORD
            </code>{' '}
            в файле <code className="font-mono text-primary text-[11px]">.env.local</code> и перезапустите сервер.
          </p>
        </div>
      </section>

      {/* 5. Theme & Session / Logout */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">Внешний вид и сессия</h2>
          <p className="text-xs text-secondary mt-0.5">
            Управление темой оформления и завершение текущего сеанса
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary">Тема оформления:</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 border border-border text-xs font-medium transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Переключить на светлую</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-accent" />
                  <span>Переключить на тёмную</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-[6px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? 'Выход...' : 'Выйти из системы'}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
