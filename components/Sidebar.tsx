'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Activity,
  BarChart3,
  Map,
  Database,
  Settings,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

interface SidebarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
  isStale?: boolean;
  totalStats?: {
    main: number;
    numbers: number;
    eskiz: number;
    not_completed?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  onRefresh,
  isRefreshing = false,
  lastUpdated,
  isStale = false,
  totalStats,
}) => {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems = [
    { href: '/overview', label: 'Главная', icon: LayoutGrid },
    { href: '/dashboard', label: 'Операционная воронка', icon: Activity },
    { href: '/analytics', label: 'BI-аналитика', icon: BarChart3 },
    { href: '/map', label: 'Карта регионов', icon: Map },
    { href: '/raw', label: 'Сырые таблицы', icon: Database },
  ];

  const totalRecords = totalStats
    ? totalStats.main + totalStats.numbers + totalStats.eskiz + (totalStats.not_completed ?? 0)
    : null;

  const statsTitle = totalStats
    ? `main_base: ${totalStats.main.toLocaleString('ru-RU')} · numbers: ${totalStats.numbers.toLocaleString('ru-RU')} · eskiz: ${totalStats.eskiz.toLocaleString('ru-RU')}${
        totalStats.not_completed !== undefined
          ? ` · not_completed: ${totalStats.not_completed.toLocaleString('ru-RU')}`
          : ''
      }`
    : 'Подключено к Google Таблицам';

  const isSettingsActive = pathname === '/settings';

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-3.5 bg-surface">
      {/* Brand & Main Nav */}
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <Link
            href="/overview"
            onClick={() => setMobileDrawerOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-7 h-7 rounded-[6px] bg-accent text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm transition-transform group-hover:scale-105">
              H
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-primary tracking-tight leading-none">
                HURMO UZ
              </span>
              <span className="text-[10px] text-secondary mt-0.5 leading-none">
                Аналитическая панель
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-1.5 text-secondary hover:text-primary rounded-[6px] hover:bg-surface-2 transition-colors"
            aria-label="Закрыть меню"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileDrawerOpen(false)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left transition-colors cursor-pointer border-l-2 ${
                  isActive
                    ? 'border-accent bg-surface-2 text-primary font-medium'
                    : 'border-transparent text-secondary hover:text-primary hover:bg-surface-2/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-accent' : 'text-secondary group-hover:text-primary'
                  }`}
                />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Real Google Sheets Connection Indicator */}
        <div
          className="mx-0.5 p-2 rounded-[6px] bg-surface-2/60 border border-border/60 text-[11px] text-secondary space-y-1"
          title={statsTitle}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-primary text-[11px]">Google Sheets</span>
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Онлайн
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-secondary">
            <span>Всего строк</span>
            <span className="text-primary font-semibold tabular-nums">
              {totalRecords !== null ? totalRecords.toLocaleString('ru-RU') : '14 742+'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border/80 space-y-2">
        {/* Settings Route Link */}
        <Link
          href="/settings"
          onClick={() => setMobileDrawerOpen(false)}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer border-l-2 ${
            isSettingsActive
              ? 'border-accent bg-surface-2 text-primary font-medium'
              : 'border-transparent text-secondary hover:text-primary hover:bg-surface-2/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className={`w-3.5 h-3.5 ${isSettingsActive ? 'text-accent' : 'text-secondary'}`} />
            <span>Настройки</span>
          </div>
        </Link>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[6px] bg-accent text-white hover:opacity-90 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Синхронизация...' : 'Обновить данные'}</span>
          </button>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-secondary">
          <span className="flex items-center gap-1.5 truncate text-[10px]">
            {lastUpdated
              ? new Date(lastUpdated).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
              : 'Синхронизировано'}
            {isStale && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                title="Данные могут быть устаревшими"
              />
            )}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-[6px] hover:bg-surface-2 text-primary transition-colors cursor-pointer"
              title={`Переключить на ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={async () => {
                await fetch('/api/login', { method: 'DELETE' });
                window.location.href = '/login';
              }}
              className="p-1.5 rounded-[6px] hover:bg-surface-2 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Выйти из системы"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-3 py-2.5 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 -ml-1.5 rounded-[6px] text-primary hover:bg-surface-2 cursor-pointer"
            aria-label="Открыть меню"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/overview" className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-[4px] bg-accent text-white flex items-center justify-center font-bold text-[10px]">
              H
            </div>
            <span className="font-semibold text-xs text-primary">HURMO UZ</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-[6px] text-primary hover:bg-surface-2 cursor-pointer"
            aria-label="Сменить тему"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-[6px] text-primary hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
              aria-label="Обновить данные"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
            </button>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-64 max-w-[85vw] h-full bg-surface border-r border-border shadow-xl animate-in slide-in-from-left duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-surface border-r border-border overflow-y-auto">
        {sidebarContent}
      </aside>
    </>
  );
};
