'use client';

import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Bot,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { openAIChat } from '@/components/AIChatDrawer';

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

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  isAction?: false;
}

interface NavActionItem {
  isAction: true;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  onClick: () => void;
}

type NavItem = NavLinkItem | NavActionItem;

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hurmo_sidebar_collapsed');
      if (saved === 'true') setIsCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('hurmo_sidebar_collapsed', String(next));
    } catch {
      // ignore
    }
  };

  const navSections: NavSection[] = [
    {
      title: 'Аналитика',
      items: [
        { href: '/overview', label: 'Главная', icon: LayoutGrid, badge: null },
        { href: '/dashboard', label: 'Воронка операций', icon: Activity, badge: null },
        { href: '/analytics', label: 'BI-аналитика', icon: BarChart3, badge: null },
        { href: '/map', label: 'Карта регионов', icon: Map, badge: '14' },
        { href: '/raw', label: 'Сырые таблицы', icon: Database, badge: null },
      ],
    },
    {
      title: 'Интеллект',
      items: [
        {
          isAction: true,
          label: 'Чат с ИИ-аналитиком',
          icon: Bot,
          badge: 'Gemini',
          onClick: () => {
            setMobileDrawerOpen(false);
            openAIChat();
          },
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
    <div className="flex flex-col h-full justify-between p-3 bg-surface select-none">
      {/* Top section: Brand + Nav */}
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <Link
            href="/overview"
            onClick={() => setMobileDrawerOpen(false)}
            className="flex items-center gap-2.5 group overflow-hidden"
          >
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-tr from-accent via-indigo-600 to-violet-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
              H
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-primary tracking-tight leading-none truncate">
                    HURMO UZ
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-accent/15 text-accent text-[9px] font-bold font-mono border border-accent/20">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-secondary mt-1 leading-none truncate">
                  Data Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-1.5 text-secondary hover:text-primary rounded-[6px] hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Закрыть меню"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={handleToggleCollapse}
            className="hidden lg:flex p-1 text-secondary hover:text-primary rounded-[6px] hover:bg-surface-2 transition-colors cursor-pointer"
            title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              <nav className="space-y-0.5">
                {section.items.map((item, iIdx) => {
                  const Icon = item.icon;

                  if (item.isAction) {
                    return (
                      <button
                        key={iIdx}
                        onClick={item.onClick}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-left transition-all duration-150 cursor-pointer group hover:bg-accent/10 text-secondary hover:text-accent ${
                          isCollapsed ? 'justify-center px-2' : ''
                        }`}
                        title={item.label}
                      >
                        <div className="relative">
                          <Icon className="w-4 h-4 shrink-0 text-accent group-hover:scale-110 transition-transform" />
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        </div>
                        {!isCollapsed && (
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="text-xs font-medium truncate text-primary group-hover:text-accent">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-accent to-indigo-600 text-white text-[9px] font-bold font-mono">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  }

                  const href = item.href;
                  const isActive =
                    pathname === href || (href !== '/overview' && pathname.startsWith(href));

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-left transition-all duration-150 cursor-pointer group ${
                        isCollapsed ? 'justify-center px-2' : ''
                      } ${
                        isActive
                          ? 'bg-accent/10 dark:bg-accent/20 text-accent font-semibold shadow-2xs'
                          : 'text-secondary hover:text-primary hover:bg-surface-2'
                      }`}
                      title={item.label}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-all ${
                          isActive
                            ? 'text-accent scale-105'
                            : 'text-secondary group-hover:text-primary group-hover:scale-105'
                        }`}
                      />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="text-xs font-medium truncate">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded-[4px] bg-surface-2 border border-border text-[10px] text-secondary font-mono">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Live Data Sync Card */}
        {!isCollapsed && (
          <div className="p-2.5 rounded-[8px] bg-gradient-to-br from-surface-2/80 to-surface-2/40 border border-border/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-primary text-[11px]">Google Таблицы</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Live
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-secondary pt-0.5">
              <span>Синхронизировано:</span>
              <span className="text-primary font-bold tabular-nums">
                {totalRecords.toLocaleString('ru-RU')} строк
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom section: Controls & Logout */}
      <div className="pt-3 border-t border-border/70 space-y-2">
        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[7px] bg-accent text-white hover:opacity-95 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer shadow-xs ${
              isCollapsed ? 'px-2' : ''
            }`}
            title="Синхронизировать данные"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {!isCollapsed && <span>{isRefreshing ? 'Загрузка...' : 'Обновить данные'}</span>}
          </button>
        )}

        {/* Footer info & Actions */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'flex-col gap-2' : 'justify-between'
          } pt-1 text-[11px] text-secondary`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-1 text-[10px] text-secondary truncate">
              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="truncate">Сессия активна</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-[6px] hover:bg-surface-2 text-secondary hover:text-primary transition-colors cursor-pointer"
              title={`Переключить на ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={async () => {
                await fetch('/api/login', { method: 'DELETE' });
                window.location.href = '/login';
              }}
              className="p-1.5 rounded-[6px] hover:bg-rose-500/10 text-secondary hover:text-rose-500 transition-colors cursor-pointer"
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
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-3.5 py-2.5 bg-surface/95 backdrop-blur-xs border-b border-border">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 -ml-1 rounded-[6px] text-primary hover:bg-surface-2 cursor-pointer"
            aria-label="Открыть меню"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/overview" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[6px] bg-gradient-to-tr from-accent to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              H
            </div>
            <span className="font-bold text-xs text-primary">HURMO UZ</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openAIChat()}
            className="p-1.5 rounded-[6px] text-accent hover:bg-accent/10 cursor-pointer"
            title="Открыть ИИ-чат"
          >
            <Sparkles className="w-4 h-4" />
          </button>
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
            className="w-64 max-w-[85vw] h-full bg-surface border-r border-border shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 bg-surface border-r border-border overflow-y-auto transition-all duration-200 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
