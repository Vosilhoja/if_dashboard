'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ExternalLink,
  Table,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Database,
  SlidersHorizontal,
  Info,
  RefreshCw,
  Bell,
  Calendar,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Send,
  History,
  Activity,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';

interface SheetInfo {
  key: string;
  name: string;
  title: string;
  url: string;
  sheetId: string;
  rowsCount?: number;
}

interface PingResult {
  latencyMs: number;
  totalRows: number;
  status: 'success' | 'error';
  message?: string;
}

interface ThresholdLogItem {
  timestamp: string;
  threshold: number;
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { weekStartsOn, setWeekStartsOn } = useAnalyticsFilter();

  const [settingsUrl, setSettingsUrl] = useState<string>('');
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Live Sheet Ping State
  const [pingingSheet, setPingingSheet] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});

  // 1. Anomaly Threshold & History
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(30);
  const [isSavedThreshold, setIsSavedThreshold] = useState<boolean>(false);
  const [thresholdHistory, setThresholdHistory] = useState<ThresholdLogItem[]>([]);

  // 2. Auto-refresh Interval
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(3); // in minutes, 0 = off

  // 3. Data Quality Thresholds
  const [qualityWarningThreshold, setQualityWarningThreshold] = useState<number>(10);
  const [qualityCriticalThreshold, setQualityCriticalThreshold] = useState<number>(20);

  // 4. Anomaly Notification & Telegram Webhook
  const [showAnomalyBanner, setShowAnomalyBanner] = useState<boolean>(true);
  const [telegramWebhookUrl, setTelegramWebhookUrl] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);

  // 5. Export Preferences
  const [csvDelimiter, setCsvDelimiter] = useState<string>(';');
  const [csvBom, setCsvBom] = useState<boolean>(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState<'csv' | 'xlsx'>('xlsx');

  // 6. Session Info
  const [sessionStartTime] = useState<string>(() => new Date().toLocaleTimeString('ru-RU'));
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Anomaly threshold
      const savedThreshold = localStorage.getItem('hurmo_anomaly_threshold');
      if (savedThreshold) {
        const val = parseInt(savedThreshold, 10);
        if (!isNaN(val) && val > 0) setAnomalyThreshold(val);
      }

      // History
      const savedHistory = localStorage.getItem('hurmo_threshold_history');
      if (savedHistory) {
        try {
          setThresholdHistory(JSON.parse(savedHistory));
        } catch {
          // ignore
        }
      }

      // Auto-refresh interval
      const savedInterval = localStorage.getItem('hurmo_auto_refresh_interval');
      if (savedInterval !== null) {
        setAutoRefreshInterval(parseInt(savedInterval, 10));
      }

      // Quality thresholds
      const savedWarn = localStorage.getItem('hurmo_quality_warn');
      if (savedWarn) setQualityWarningThreshold(parseInt(savedWarn, 10));

      const savedCrit = localStorage.getItem('hurmo_quality_crit');
      if (savedCrit) setQualityCriticalThreshold(parseInt(savedCrit, 10));

      // Notifications
      const savedBanner = localStorage.getItem('hurmo_show_anomaly_banner');
      if (savedBanner !== null) setShowAnomalyBanner(savedBanner === 'true');

      const savedTgUrl = localStorage.getItem('hurmo_tg_webhook');
      if (savedTgUrl) setTelegramWebhookUrl(savedTgUrl);

      const savedTgChat = localStorage.getItem('hurmo_tg_chat_id');
      if (savedTgChat) setTelegramChatId(savedTgChat);

      // Export settings
      const savedDelim = localStorage.getItem('hurmo_csv_delimiter');
      if (savedDelim) setCsvDelimiter(savedDelim);

      const savedBom = localStorage.getItem('hurmo_csv_bom');
      if (savedBom !== null) setCsvBom(savedBom === 'true');

      const savedFormat = localStorage.getItem('hurmo_export_format');
      if (savedFormat === 'csv' || savedFormat === 'xlsx') setDefaultExportFormat(savedFormat);
    }

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

      const updatedHistory: ThresholdLogItem[] = [
        {
          timestamp: new Date().toLocaleString('ru-RU'),
          threshold: newVal,
        },
        ...thresholdHistory.slice(0, 4),
      ];
      setThresholdHistory(updatedHistory);
      localStorage.setItem('hurmo_threshold_history', JSON.stringify(updatedHistory));

      setIsSavedThreshold(true);
      setTimeout(() => setIsSavedThreshold(false), 2000);
    }
  };

  const handlePingSheet = async (sheetKey: string) => {
    setPingingSheet(sheetKey);
    const start = performance.now();
    try {
      const res = await fetch(`/api/sheets/${sheetKey}?page=1&pageSize=1&fresh=true`);
      const duration = Math.round(performance.now() - start);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setPingResults((prev) => ({
        ...prev,
        [sheetKey]: {
          latencyMs: duration,
          totalRows: data.total || 0,
          status: 'success',
        },
      }));
    } catch (e: any) {
      const duration = Math.round(performance.now() - start);
      setPingResults((prev) => ({
        ...prev,
        [sheetKey]: {
          latencyMs: duration,
          totalRows: 0,
          status: 'error',
          message: e.message || 'Ошибка сети',
        },
      }));
    } finally {
      setPingingSheet(null);
    }
  };

  const handleSaveAutoRefresh = (minutes: number) => {
    setAutoRefreshInterval(minutes);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_auto_refresh_interval', String(minutes));
    }
  };

  const handleSaveQuality = (warn: number, crit: number) => {
    setQualityWarningThreshold(warn);
    setQualityCriticalThreshold(crit);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_quality_warn', String(warn));
      localStorage.setItem('hurmo_quality_crit', String(crit));
    }
  };

  const handleSaveTelegram = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_show_anomaly_banner', String(showAnomalyBanner));
      localStorage.setItem('hurmo_tg_webhook', telegramWebhookUrl);
      localStorage.setItem('hurmo_tg_chat_id', telegramChatId);
      setTelegramTestStatus('Сохранено');
      setTimeout(() => setTelegramTestStatus(null), 2500);
    }
  };

  const handleSaveExportSettings = (delim: string, bom: boolean, format: 'csv' | 'xlsx') => {
    setCsvDelimiter(delim);
    setCsvBom(bom);
    setDefaultExportFormat(format);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_csv_delimiter', delim);
      localStorage.setItem('hurmo_csv_bom', String(bom));
      localStorage.setItem('hurmo_export_format', format);
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
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-xl font-bold text-primary tracking-tight">Настройки системы HURMO UZ</h1>
        <p className="text-xs text-secondary mt-0.5">
          Управление источниками данных, порогами аномалий, интервалами синхронизации и параметрами экспорта
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Status Settings Link (Google Sheets Tab) */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
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

      {/* 2. Connected Google Sheets Cards with Live Connection Test */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
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
          Проверка состояния подключения, задержки API и прямые ссылки на исходные таблицы:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {sheets.map((sheet) => {
            const ping = pingResults[sheet.key];
            const isPinging = pingingSheet === sheet.key;

            return (
              <div
                key={sheet.key}
                className="p-3.5 rounded-[6px] bg-surface-2/60 border border-border/60 flex flex-col justify-between space-y-3"
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

                {/* Live Ping Output */}
                {ping && (
                  <div
                    className={`px-2 py-1 rounded-[4px] text-[11px] flex items-center justify-between ${
                      ping.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    <span>Задержка: {ping.latencyMs} мс</span>
                    <span>Всего строк: {ping.totalRows.toLocaleString('ru-RU')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                  <button
                    onClick={() => handlePingSheet(sheet.key)}
                    disabled={isPinging}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] bg-surface hover:bg-surface-2 border border-border text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Activity className={`w-3 h-3 ${isPinging ? 'animate-spin text-accent' : ''}`} />
                    <span>{isPinging ? 'Проверка...' : 'Проверить связь'}</span>
                  </button>

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
            );
          })}
        </div>
      </section>

      {/* 3. Auto-Refresh & Sheet Cache TTL */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Интервал автообновления данных</h2>
          </div>
          <span className="text-xs font-bold text-primary tabular-nums">
            {autoRefreshInterval === 0 ? 'Отключено' : `Каждые ${autoRefreshInterval} мин`}
          </span>
        </div>
        <p className="text-xs text-secondary">
          Фоновая синхронизация данных с Google Таблицами на открытых страницах дашборда:
        </p>

        <div className="flex items-center flex-wrap gap-2 pt-1">
          {[
            { label: '1 мин', val: 1 },
            { label: '3 мин (по умолчанию)', val: 3 },
            { label: '5 мин', val: 5 },
            { label: '15 мин', val: 15 },
            { label: '30 мин', val: 30 },
            { label: 'Отключено', val: 0 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => handleSaveAutoRefresh(item.val)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer border ${
                autoRefreshInterval === item.val
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* 4. Anomaly Threshold & History Log */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
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
          Метрики звонков и отказов помечаются как аномальные при отклонении от 4-недельной базы более чем на указанный процент.
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
                    ? 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
                }`}
              >
                ±{preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Change History Log */}
        {thresholdHistory.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-secondary mb-1.5">
              <History className="w-3 h-3" />
              <span>История изменений порогов:</span>
            </div>
            <div className="space-y-1">
              {thresholdHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-secondary">
                  <span>{item.timestamp}</span>
                  <span className="font-mono text-primary font-semibold">±{item.threshold}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. Data Quality Thresholds */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Пороги контроля качества данных</h2>
        </div>
        <p className="text-xs text-secondary">
          Настройка критичности процента незаполненных обязательных полей (телефон, регион, возраст) в карточке качества:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 rounded-[6px] bg-surface-2/60 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary font-medium">Предупреждение (жёлтый):</span>
              <span className="font-bold text-primary tabular-nums">{qualityWarningThreshold}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={qualityWarningThreshold}
              onChange={(e) => handleSaveQuality(parseInt(e.target.value, 10), qualityCriticalThreshold)}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-[6px] bg-surface-2/60 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary font-medium">Критический порог (красный):</span>
              <span className="font-bold text-primary tabular-nums">{qualityCriticalThreshold}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={50}
              value={qualityCriticalThreshold}
              onChange={(e) => handleSaveQuality(qualityWarningThreshold, parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* 6. Notifications & Webhook */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Уведомления об аномалиях</h2>
          </div>
          {telegramTestStatus && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {telegramTestStatus}
            </span>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-2.5 text-xs text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={showAnomalyBanner}
              onChange={(e) => setShowAnomalyBanner(e.target.checked)}
              className="w-4 h-4 rounded accent-accent cursor-pointer"
            />
            <span>Показывать плашку аномалий на Главной странице при обнаружении отклонений</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] text-secondary font-medium">Telegram Bot Webhook / Token:</label>
              <input
                type="text"
                placeholder="https://api.telegram.org/bot..."
                value={telegramWebhookUrl}
                onChange={(e) => setTelegramWebhookUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-secondary font-medium">Telegram Chat ID:</label>
              <input
                type="text"
                placeholder="-100123456789"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleSaveTelegram}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-95 text-xs font-medium transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Сохранить параметры уведомлений</span>
          </button>
        </div>
      </section>

      {/* 7. Global Calendar & Week Start */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Глобальный старт недели</h2>
        </div>
        <p className="text-xs text-secondary">
          Определяет день начала недели для фильтрации периодов воронки, аналитики и карты:
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setWeekStartsOn(1)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer border ${
              weekStartsOn === 1
                ? 'bg-accent text-white border-accent shadow-xs'
                : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
            }`}
          >
            Понедельник (стандарт СНГ)
          </button>
          <button
            onClick={() => setWeekStartsOn(0)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer border ${
              weekStartsOn === 0
                ? 'bg-accent text-white border-accent shadow-xs'
                : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
            }`}
          >
            Воскресенье
          </button>
        </div>
      </section>

      {/* 8. Export Preferences */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Параметры экспорта данных</h2>
        </div>
        <p className="text-xs text-secondary">
          Настройки разделителей и формата таблиц для совместимости с Microsoft Excel:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] text-secondary font-medium">Формат по умолчанию:</label>
            <select
              value={defaultExportFormat}
              onChange={(e) => handleSaveExportSettings(csvDelimiter, csvBom, e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
            >
              <option value="xlsx">Excel (.xlsx / .xls)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-secondary font-medium">Разделитель CSV:</label>
            <select
              value={csvDelimiter}
              onChange={(e) => handleSaveExportSettings(e.target.value, csvBom, defaultExportFormat)}
              className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
            >
              <option value=";">Точка с запятой (;) — Excel СНГ</option>
              <option value=",">Запятая (,) — Международный</option>
              <option value="	">Табуляция (\t)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-secondary font-medium">Кодировка UTF-8 BOM:</label>
            <select
              value={csvBom ? 'true' : 'false'}
              onChange={(e) => handleSaveExportSettings(csvDelimiter, e.target.value === 'true', defaultExportFormat)}
              className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
            >
              <option value="true">С BOM (без кракозябр в Excel)</option>
              <option value="false">Без BOM (чистый UTF-8)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 9. Theme & Session / Logout */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-primary">Внешний вид и сессия</h2>
          <p className="text-xs text-secondary mt-0.5">
            Управление темой оформления и текущим сеансом работы
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between p-3 rounded-[6px] bg-surface-2/60 border border-border/60">
            <div>
              <div className="text-xs font-medium text-primary">Тема оформления</div>
              <div className="text-[11px] text-secondary mt-0.5">
                {theme === 'dark' ? 'Тёмная тема активна' : 'Светлая тема активна'}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-surface hover:bg-surface-2 border border-border text-xs font-medium transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Светлая</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-accent" />
                  <span>Тёмная</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[6px] bg-surface-2/60 border border-border/60">
            <div>
              <div className="text-xs font-medium text-primary">Сессия пользователя</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Вход: {sessionStartTime}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Выход...' : 'Выйти'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
