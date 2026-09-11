'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  LogOut,
  Bot,
  Search,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAuth, hasMinRole } from '@/lib/auth-context';
import { openCommandPalette } from '@/components/CommandPalette';

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
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  isAi?: boolean;
  minRole?: 'viewer' | 'operator' | 'manager' | 'admin' | 'super_admin';
}

const allNavItems: NavItem[] = [
  {
    href: '/overview',
    label: 'Главная',
    subtitle: 'Сводный обзор и статус',
    icon: LayoutGrid,
  },
  {
    href: '/dashboard',
    label: 'Операционная воронка',
    subtitle: 'Контроль звонков и конверсий',
    icon: Activity,
  },
  {
    href: '/analytics',
    label: 'BI-аналитика',
    subtitle: 'Демография и образование',
    icon: BarChart3,
  },
  {
    href: '/map',
    label: 'Карта регионов',
    subtitle: 'География 14 областей',
    icon: Map,
    badge: '14',
    minRole: 'operator',
  },
  {
    href: '/raw',
    label: 'Сырые таблицы',
    subtitle: 'Все 4 базы данных Google',
    icon: Database,
    minRole: 'operator',
  },
  {
    href: '/chat',
    label: 'ИИ-Аналитик',
    subtitle: 'Нейросетевой аудит данных',
    icon: Bot,
    badge: 'AI PRO',
    isAi: true,
  },
  {
    href: '/settings',
    label: 'Настройки системы',
    subtitle: 'Интервалы, кэш и пороги',
    icon: Settings,
    minRole: 'manager',
  },
];

// Nav item micro-interaction variants
const navItemVariants = {
  rest: { x: 0 },
  hover: { x: 2 },
  tap: { scale: 0.97 },
};

export const Sidebar: React.FC<SidebarProps> = ({
  onRefresh,
  isRefreshing = false,
  totalStats,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { role, logout } = useAuth();
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Filter nav items based on current user role
  const navItems = allNavItems.filter((item) => {
    if (!item.minRole) return true;
    return hasMinRole(role, item.minRole);
  });

  const totalRecords = totalStats
    ? totalStats.main + totalStats.numbers + totalStats.eskiz + (totalStats.not_completed ?? 0)
    : 14742;

  return (
    <>
      {/* ============================================================
          МОБИЛЬНЫЙ ХЕДЕР В СТИЛЕ РЕФЕРЕНСА (Премиум Dark/Light, h-16)
          ============================================================ */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-surface/90 backdrop-blur-xl border-b border-border/70 shadow-sm transition-all">
        {/* Бренд */}
        <Link
          href="/overview"
          className="flex items-center gap-2.5 active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent via-indigo-600 to-violet-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-accent/25">
            H
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-primary tracking-tight">
              hurmo<span className="text-accent">uz</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-accent/15 text-accent text-[9px] font-bold font-mono">
              PRO
            </span>
          </div>
        </Link>

        {/* Правые действия: Поиск, Тема, Бургер с бейджем */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => openCommandPalette()}
            className="p-2.5 rounded-xl bg-surface-2/60 border border-border/60 text-secondary hover:text-primary transition-all flex items-center justify-center"
            title="Поиск по системе"
          >
            <Search className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-surface-2/60 border border-border/60 text-secondary hover:text-primary transition-all flex items-center justify-center"
            title="Сменить тему оформления"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.button>

          {/* Анимированный бургер-переключатель */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileDrawerOpen(true)}
            className="relative p-2.5 rounded-xl bg-surface-2/60 border border-border/60 text-primary transition-all flex items-center justify-center"
            aria-label="Открыть навигацию"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
              {navItems.length}
            </span>
          </motion.button>
        </div>
      </header>

      {/* ============================================================
          МОБИЛЬНОЕ ВЫЕЗДНОЕ МЕНЮ с AnimatePresence
          ============================================================ */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-[360px] h-full bg-surface border-r border-border shadow-2xl flex flex-col justify-between overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Верхняя часть меню: Логотип + Крестик */}
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <Link
                    href="/overview"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-2"
                  >
                    <span className="font-black text-xl text-primary tracking-tight">
                      hurmo<span className="text-accent">uz</span>
                    </span>
                  </Link>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-2 rounded-xl bg-surface-2 border border-border/80 text-secondary hover:text-primary transition-all cursor-pointer"
                    aria-label="Закрыть меню"
                  >
                    <X className="w-5 h-5 text-rose-500" />
                  </motion.button>
                </div>

                {/* Поисковая строка */}
                <div
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    openCommandPalette();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-surface-2/80 border border-border/80 text-secondary hover:text-primary cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Search className="w-4 h-4 text-secondary/70 shrink-0" />
                  <span className="text-xs text-secondary/70">
                    Поиск метрик, областей, таблиц...
                  </span>
                </div>

                {/* Список навигации */}
                <nav className="flex flex-col divide-y divide-border/40 pt-1">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/overview' && pathname.startsWith(item.href));

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.2 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={`flex items-center justify-between py-3.5 px-2 transition-all active:bg-surface-2/80 group ${
                            isActive ? 'text-accent font-bold' : 'text-primary font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                isActive
                                  ? 'bg-accent text-white'
                                  : item.isAi
                                  ? 'bg-accent/15 text-accent'
                                  : 'bg-surface-2 text-secondary group-hover:text-primary'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="text-sm tracking-tight leading-tight">
                                {item.label}
                              </span>
                              {item.subtitle && (
                                <span className="text-[11px] text-secondary/70 leading-none mt-1 truncate">
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/20">
                                {item.badge}
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-secondary/50 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
              </div>

              {/* Нижний подвал меню */}
              <div className="p-5 border-t border-border/80 space-y-4 bg-surface-2/30">
                {/* Язык и переключатель темы */}
                <div className="flex items-center justify-between text-xs text-secondary">
                  <span className="font-medium text-secondary">Язык и тема</span>
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-xl bg-surface-2 border border-border text-primary font-bold text-xs">
                      RU
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleTheme}
                      className="p-2 rounded-xl bg-surface-2 border border-border text-secondary hover:text-primary transition-all"
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </motion.button>
                  </div>
                </div>

                {/* Кнопка синхронизации и выхода */}
                <div className="grid grid-cols-2 gap-2.5">
                  {onRefresh && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        onRefresh();
                      }}
                      disabled={isRefreshing}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface border border-border text-primary text-xs font-bold shadow-xs hover:bg-surface-2 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
                      <span>Синхронизация</span>
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={logout}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 hover:opacity-95 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Выйти</span>
                  </motion.button>
                </div>

                {/* Статус сессии */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-secondary pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Google Sheets API • {totalRecords.toLocaleString('ru-RU')} записей</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          ДЕСТКТОПНЫЙ SIDEBAR
          ============================================================ */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-surface border-r border-border overflow-y-auto">
        <div className="flex flex-col h-full justify-between p-4 bg-surface select-none">
          <div className="space-y-5">
            {/* Brand Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
              <Link href="/overview" className="flex items-center gap-3 group">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.15 }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent via-indigo-600 to-violet-500 text-white flex items-center justify-center font-black text-base shadow-sm"
                >
                  H
                </motion.div>
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
            </div>

            {/* Desktop Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/overview' && pathname.startsWith(item.href));

                return (
                  <motion.div
                    key={item.href}
                    variants={navItemVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    transition={{ duration: 0.12 }}
                  >
                    <Link
                      href={item.href}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150 cursor-pointer group ${
                        isActive
                          ? 'bg-accent text-white font-semibold shadow-xs'
                          : item.isAi
                          ? 'text-primary hover:bg-accent/10 hover:text-accent font-medium'
                          : 'text-secondary hover:text-primary hover:bg-surface-2 font-medium'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs truncate flex-1">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-accent/15 text-accent'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </div>

          {/* Desktop Footer */}
          <div className="pt-3 border-t border-border/80 space-y-2.5">
            {onRefresh && (
              <motion.button
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.97 }}
                onClick={onRefresh}
                disabled={isRefreshing}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent text-white hover:opacity-95 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Синхронизация...' : 'Обновить данные'}</span>
              </motion.button>
            )}

            <div className="flex items-center justify-between text-[11px] text-secondary">
              <div className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Сессия защищена</span>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg hover:bg-surface-2 text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={logout}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-secondary hover:text-rose-500 transition-colors cursor-pointer"
                  title="Выйти из системы"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
