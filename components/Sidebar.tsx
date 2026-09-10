'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Database,
  RefreshCw,
  Sun,
  Moon,
  Sliders,
  ExternalLink,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

export type ViewTab = 'dashboard' | 'analytics' | 'raw';

interface SidebarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated?: string;
  isStale?: boolean;
  totalStats?: {
    main: number;
    numbers: number;
    eskiz: number;
    not_completed?: number;
  };
  settingsUrl?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  lastUpdated,
  isStale,
  totalStats,
  settingsUrl,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as const, label: 'Операционная воронка', icon: LayoutDashboard },
    { id: 'analytics' as const, label: 'BI-аналитика', icon: BarChart3 },
    { id: 'raw' as const, label: 'Сырые таблицы', icon: Database },
  ];

  const handleNavClick = (tab: ViewTab) => {
    onTabChange(tab);
    setMobileDrawerOpen(false);
  };

  const totalRecords = totalStats
    ? totalStats.main + totalStats.numbers + totalStats.eskiz + (totalStats.not_completed ?? 0)
    : null;

  const statsTitle = totalStats
    ? `main_base: ${totalStats.main.toLocaleString('ru-RU')} · numbers: ${totalStats.numbers.toLocaleString('ru-RU')} · eskiz: ${totalStats.eskiz.toLocaleString('ru-RU')}${
        totalStats.not_completed !== undefined
          ? ` · not_completed: ${totalStats.not_completed.toLocaleString('ru-RU')}`
          : ''
      }`
    : undefined;

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-3.5">
      {/* Brand */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-[4px] bg-accent text-white flex items-center justify-center font-bold text-xs shrink-0">
              H
            </div>
            <span className="text-sm font-semibold text-primary tracking-tight">HURMO UZ</span>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-1.5 text-secondary hover:text-primary rounded-[6px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation — no section label, no sublabels */}
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-left transition-colors cursor-pointer border-l-2 ${
                  isActive
                    ? 'border-accent bg-surface-2 text-primary font-medium'
                    : 'border-transparent text-secondary hover:text-primary hover:bg-surface-2/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-secondary'}`} />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Total records — single line, details on hover via title attr */}
        {totalRecords !== null && (
          <div
            className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-secondary"
            title={statsTitle}
          >
            <span>Всего записей</span>
            <span className="text-primary font-medium tabular-nums">
              {totalRecords.toLocaleString('ru-RU')}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border space-y-2">
        {settingsUrl && (
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] hover:bg-surface-2 text-secondary hover:text-primary text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-secondary" />
              <span>Настройки статусов</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[6px] bg-accent text-white hover:opacity-90 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Синхронизация...' : 'Обновить данные'}</span>
        </button>

        <div className="flex items-center justify-between pt-1 text-[11px] text-secondary">
          <span className="flex items-center gap-1.5 truncate">
            {lastUpdated
              ? new Date(lastUpdated).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
              : '—'}
            {isStale && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                title="Данные устарели — нажмите «Обновить данные»"
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
            className="p-1.5 -ml-1.5 rounded-[6px] text-primary hover:bg-surface-2"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-[4px] bg-accent text-white flex items-center justify-center font-bold text-[10px]">
              H
            </div>
            <span className="font-semibold text-xs text-primary">HURMO UZ</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-[6px] text-primary hover:bg-surface-2"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-[6px] text-primary hover:bg-surface-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-60 max-w-[80vw] h-full bg-surface border-r border-border animate-in slide-in-from-left duration-150"
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
