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
  Bot,
  ShieldCheck,
  Sparkles,
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  isAi?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
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

  const navSections: NavSection[] = [
    {
      title: 'Аналитика',
      items: [
        { href: '/overview', label: 'Главная', icon: LayoutGrid, badge: null },
        { href: '/dashboard', label: 'Операционная воронка', icon: Activity, badge: null },
        { href: '/analytics', label: 'BI-аналитика', icon: BarChart3, badge: null },
        { href: '/map', label: 'Карта регионов', icon: Map, badge: '14' },
        { href: '/raw', label: 'Сырые таблицы', icon: Database, badge: null },
      ],
    },
    {
      title: 'Интеллект',
      items: [
        {
          href: '/chat',
          label: 'ИИ-Аналитик',
          icon: Bot,
          badge: 'Online',
          isAi: true,
        },
      ],
    },
    {
      title: 'Система',
      items: [
        { href: '/settings', label: 'Настройки', icon: Settings, badge: null },
      ],
    },
  ];

  const totalRecords = totalStats
    ? totalStats.main + totalStats.numbers + totalStats.eskiz + (totalStats.not_completed ?? 0)
    : 14742;

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4 bg-surface select-none">
      {/* Top section: Brand + Nav */}
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
          <Link
            href="/overview"
            onClick={() => setMobileDrawerOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-tr from-accent via-indigo-600 to-violet-500 text-white flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 transition-transform duration-200">
              H
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-primary tracking-tight leading-none">
                  HURMO UZ
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-accent/15 text-accent text-[9px] font-bold font-mono border border-accent/20">
                  PRO
                </span>
              </div>
              <span className="text-[11px] text-secondary mt-1 leading-none">
                Data Intelligence
              </span>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-1.5 text-secondary hover:text-primary rounded-[6px] hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Закрыть меню"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1.5">
              <div className="px-2 text-[10px] font-bold text-secondary/70 uppercase tracking-wider">
                {section.title}
              </div>

              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/overview' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-left transition-all duration-150 cursor-pointer group ${
                        isActive
                          ? 'bg-accent text-white font-semibold shadow-xs'
                          : item.isAi
                          ? 'text-primary hover:bg-accent/10 hover:text-accent font-medium'
                          : 'text-secondary hover:text-primary hover:bg-surface-2 font-medium'
                      }`}
                      title={item.label}
                    >
                      <div className="relative flex items-center justify-center">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isActive
                              ? 'text-white'
                              : item.isAi
                              ? 'text-accent group-hover:scale-110'
                              : 'text-secondary group-hover:text-primary group-hover:scale-105'
                          }`}
                        />
                        {item.isAi && !isActive && (
                          <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        )}
                      </div>

                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="text-xs truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono tracking-wide ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.isAi
                                ? 'bg-accent/15 text-accent border border-accent/25'
                                : 'bg-surface-2 border border-border text-secondary'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Live Data Sync Card */}
        <div className="p-3 rounded-[10px] bg-surface-2/70 border border-border/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-primary text-[11px]">Google Таблицы</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
              Онлайн
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-secondary pt-0.5">
            <span>Синхронизировано:</span>
            <span className="text-primary font-bold tabular-nums">
              {totalRecords.toLocaleString('ru-RU')} строк
            </span>
          </div>
        </div>
      </div>

      {/* Bottom section: Controls & Logout */}
      <div className="pt-3 border-t border-border/80 space-y-2.5">
        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] bg-accent text-white hover:opacity-95 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer shadow-xs"
            title="Синхронизировать данные"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Синхронизация...' : 'Обновить данные'}</span>
          </button>
        )}

        {/* Footer info & Actions */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-secondary">
          <div className="flex items-center gap-1.5 text-[11px] text-secondary truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">Сессия активна</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-[6px] hover:bg-surface-2 text-secondary hover:text-primary transition-colors cursor-pointer"
              title={`Переключить на ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={async () => {
                await fetch('/api/login', { method: 'DELETE' });
                window.location.href = '/login';
              }}
              className="p-1.5 rounded-[6px] hover:bg-rose-500/10 text-secondary hover:text-rose-500 transition-colors cursor-pointer"
              title="Выйти из системы"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface/95 backdrop-blur-xs border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 -ml-1.5 rounded-[6px] text-primary hover:bg-surface-2 cursor-pointer"
            aria-label="Открыть меню"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/overview" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-gradient-to-tr from-accent to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              H
            </div>
            <span className="font-bold text-xs text-primary">HURMO UZ</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="p-1.5 rounded-[6px] text-accent hover:bg-accent/10 cursor-pointer"
            title="Открыть ИИ-Аналитик"
          >
            <Bot className="w-4 h-4" />
          </Link>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-[6px] text-secondary hover:text-primary hover:bg-surface-2 cursor-pointer"
            aria-label="Сменить тему"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-[6px] text-secondary hover:text-primary hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
              aria-label="Обновить данные"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-surface border-r border-border shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Fixed Width Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-surface border-r border-border overflow-y-auto">
        {sidebarContent}
      </aside>
    </>
  );
};
