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
    {
      id: 'dashboard' as const,
      label: 'Операционная воронка',
      sublabel: '8 показателей воронки',
      icon: LayoutDashboard,
    },
    {
      id: 'analytics' as const,
      label: 'BI-аналитика',
      sublabel: 'Срез пользователей базы',
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
    <div className="flex flex-col h-full justify-between p-3.5">
      {/* Brand & Top Info */}
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-[4px] bg-accent text-white flex items-center justify-center font-bold text-xs shrink-0">
              H
            </div>
            <div>
              <div className="text-sm font-semibold text-primary tracking-tight">HURMO UZ</div>
              <div className="text-[11px] text-secondary">BI Dashboard</div>
            </div>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-1.5 text-secondary hover:text-primary rounded-[6px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vertical Navigation items: Linear-style thin left accent border, no full block fill */}
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase font-medium text-secondary px-2.5 mb-1.5 tracking-wider">
            Разделы
          </div>
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
                <div className="truncate">
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-[10px] text-secondary">
                    {item.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Database overview */}
        {totalStats && (
          <div className="p-2.5 rounded-[6px] bg-surface-2 border border-border text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-secondary text-[10px] font-medium uppercase tracking-wider">
              <Activity className="w-3 h-3 text-secondary" />
              <span>Базы данных</span>
            </div>
            <div className="space-y-1 text-secondary text-[11px]">
              <div className="flex justify-between">
                <span>main_base:</span>
                <strong className="text-primary tabular-nums">{totalStats.main.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>numbers:</span>
                <strong className="text-primary tabular-nums">{totalStats.numbers.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>eskiz:</span>
                <strong className="text-primary tabular-nums">{totalStats.eskiz.toLocaleString()}</strong>
              </div>
              {totalStats.not_completed !== undefined && (
                <div className="flex justify-between">
                  <span>not_completed:</span>
                  <strong className="text-primary tabular-nums">{totalStats.not_completed.toLocaleString()}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Sidebar Footer */}
      <div className="pt-3 border-t border-border space-y-2">
        {settingsUrl && (
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border text-xs font-medium transition-colors"
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

        <div className="flex items-center justify-between pt-1 text-xs text-secondary">
          <div className="truncate text-[10px]">
            {lastUpdated ? (
              <span>
                {new Date(lastUpdated).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                {isStale && ' ⚠️'}
              </span>
            ) : (
              'HURMO UZ'
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-primary border border-border transition-colors cursor-pointer"
            title={`Переключить на ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-accent" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Compact Top-bar for Mobile (< lg) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-3 py-2.5 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 -ml-1.5 rounded-[6px] text-primary hover:bg-surface-2"
            title="Открыть меню"
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
            title="Сменить тему"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-accent" />}
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-[6px] text-primary hover:bg-surface-2 disabled:opacity-50"
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
            className="w-64 max-w-[80vw] h-full bg-surface border-r border-border animate-in slide-in-from-left duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-surface border-r border-border overflow-y-auto">
        {sidebarContent}
      </aside>
    </>
  );
};
