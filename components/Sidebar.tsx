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
  Activity,
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
    {
      id: 'dashboard' as const,
      label: 'Операционная воронка',
      sublabel: '8 ключевых метрик',
      icon: LayoutDashboard,
    },
    {
      id: 'analytics' as const,
      label: 'BI-аналитика',
      sublabel: 'main_base срез',
      icon: BarChart3,
    },
    {
      id: 'raw' as const,
      label: 'Сырые таблицы',
      sublabel: 'main, numbers, eskiz',
      icon: Database,
    },
  ];

  const handleNavClick = (tab: ViewTab) => {
    onTabChange(tab);
    setMobileDrawerOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4 sm:p-5">
      {/* Brand & Top Info */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-base shrink-0">
              H
            </div>
            <div>
              <div className="text-base font-bold text-primary tracking-tight">HURMO UZ</div>
              <div className="text-[11px] text-secondary">Аналитический дашборд</div>
            </div>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-2 text-secondary hover:text-primary rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vertical Navigation items */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-semibold text-secondary px-3 mb-2 tracking-wider">
            Разделы
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-accent text-white font-medium shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface-2'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="truncate">
                  <div className="text-xs sm:text-sm">{item.label}</div>
                  <div
                    className={`text-[10px] ${
                      isActive ? 'text-white/80' : 'text-secondary/70'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Global base count overview */}
        {totalStats && (
          <div className="p-3 rounded-xl bg-surface-2/60 border border-border text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-secondary text-[11px] font-semibold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-accent" />
              <span>Базы данных</span>
            </div>
            <div className="space-y-1 text-secondary text-[11px]">
              <div className="flex justify-between">
                <span>main_base:</span>
                <strong className="text-primary font-mono">{totalStats.main.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>numbers:</span>
                <strong className="text-primary font-mono">{totalStats.numbers.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>eskiz:</span>
                <strong className="text-primary font-mono">{totalStats.eskiz.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Sidebar Footer */}
      <div className="pt-4 border-t border-border space-y-3">
        {settingsUrl && (
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border text-xs font-medium transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-accent" />
              <span>Настройки статусов</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-white hover:opacity-90 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Синхронизация...' : 'Обновить данные'}</span>
        </button>

        <div className="flex items-center justify-between pt-2 text-xs text-secondary">
          <div className="truncate text-[10px]">
            {lastUpdated ? (
              <span>
                Обновлено: {new Date(lastUpdated).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                {isStale && ' ⚠️'}
              </span>
            ) : (
              'HURMO UZ'
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-surface-2 hover:bg-surface-2/80 text-primary border border-border transition-colors cursor-pointer"
            title={`Переключить на ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-accent" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Compact Top-bar for Mobile (< lg) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface border-b border-border shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 -ml-2 rounded-lg text-primary hover:bg-surface-2"
            title="Открыть меню"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent text-white flex items-center justify-center font-bold text-xs">
              H
            </div>
            <span className="font-bold text-sm text-primary">HURMO UZ</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-primary hover:bg-surface-2"
            title="Сменить тему"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-accent" />}
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg text-primary hover:bg-surface-2 disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-surface border-r border-border shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-screen sticky top-0 bg-surface border-r border-border overflow-y-auto">
        {sidebarContent}
      </aside>
    </>
  );
};
