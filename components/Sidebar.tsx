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
  SlidersHorizontal,
  Users,
  RefreshCw,
  Sun,
  Moon,
  X,
  LogOut,
  Bot,
  Search,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAuth, hasMinRole, normalizeRole } from '@/lib/auth-context';
import { openCommandPalette } from '@/components/CommandPalette';

interface SidebarProps {
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
    subtitle: 'Все 5 таблиц Google',
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
    href: '/users',
    label: 'Пользователи',
    subtitle: 'Управление доступом и ролями',
    icon: Users,
    minRole: 'admin',
  },
  {
    href: '/statuses',
    label: 'Статусы',
    subtitle: 'Варианты статусов звонков',
    icon: SlidersHorizontal,
    minRole: 'admin',
  },
  {
    href: '/settings',
    label: 'Настройки',
    subtitle: 'Интервалы, кэш и пороги',
    icon: Settings,
  },
];

// Nav item micro-interaction variants
const navItemVariants = {
  rest: { x: 0 },
  hover: { x: 2 },
  tap: { scale: 0.97 },
};

export const Sidebar: React.FC<SidebarProps> = ({
  isRefreshing = false,
  totalStats,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const normalizedRole = normalizeRole(role);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [refreshAnimationKey, setRefreshAnimationKey] = useState(0);
  const [localRefreshInProgress, setLocalRefreshInProgress] = useState(false);
  const refreshInProgress = isRefreshing || localRefreshInProgress;

  const handleRefresh = async () => {
    if (refreshInProgress) return;
    setLocalRefreshInProgress(true);
    setRefreshAnimationKey((key) => key + 1);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 180_000);
    try {
      const response = await fetch('/api/proxy/data?fresh=true', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      let classificationJobId: string | null = null;
      try {
        const classifyResponse = await fetch('/api/proxy/admin/statuses/classify-unmatched', {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
        });
        const classifyData = await classifyResponse.json().catch(() => ({}));
        if (classifyResponse.ok && typeof classifyData.jobId === 'string') {
          classificationJobId = classifyData.jobId;
        } else if (!classifyResponse.ok) {
          console.warn('[Sidebar] unmatched classification was not queued:', classifyData.error);
        }
      } catch (classificationError) {
        if (!(classificationError instanceof DOMException && classificationError.name === 'AbortError')) {
          console.warn('[Sidebar] unmatched classification failed:', classificationError);
        }
      }
      window.dispatchEvent(new CustomEvent('hurmo:sync', {
        detail: { classificationJobId },
      }));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('[Sidebar] sync failed', error);
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLocalRefreshInProgress(false);
    }
  };

  // Lock body scroll when mobile burger menu is opened
  useEffect(() => {
    if (mobileDrawerOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [mobileDrawerOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Filter nav items based on user role and granular page permissions
  const navItems = allNavItems.filter((item) => {
    // 1. super_admin has unconditional access to all 8 pages
    if (normalizedRole === 'super_admin') {
      return true;
    }

    // 2. Settings is strictly for super_admin
    if (item.href === '/settings') {
      return false;
    }

    // 3. Users is strictly for super_admin and admin
    if (item.href === '/users') {
      return normalizedRole === 'admin';
    }

    // 4. Check granular page permissions for specific roles
    if (user && Array.isArray(user.permissions)) {
      if (user.permissions.includes('*')) return true;

      let pageKey = '';
      if (item.href === '/overview') pageKey = 'overview';
      else if (item.href === '/dashboard') pageKey = 'dashboard';
      else if (item.href === '/analytics') pageKey = 'analytics';
      else if (item.href === '/map') pageKey = 'map';
      else if (item.href === '/raw') pageKey = 'raw';
      else if (item.href === '/chat') pageKey = 'chat';

      if (pageKey && !user.permissions.includes(pageKey)) {
        return false;
      }
    }

    // 5. Check minimum role if specified
    if (item.minRole && !hasMinRole(normalizedRole, item.minRole)) {
      return false;
    }

    return true;
  });

  const totalRecords = totalStats
    ? totalStats.main + totalStats.numbers + totalStats.eskiz + (totalStats.not_completed ?? 0)
    : 0;

  return (
    <>
      {/* ============================================================
          МОБИЛЬНЫЙ ХЕДЕР В СТИЛЕ РЕФЕРЕНСА (Премиум Dark/Light, h-16)
          ============================================================ */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-surface/90 backdrop-blur-xl border-b border-border/70 shadow-sm transition-all">
        {/* Бренд */}
        <Link
          href="/overview"
          prefetch={false}
          className="flex items-center gap-2.5 active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-sm shadow-md shadow-accent/25">
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md lg:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="w-full h-full bg-surface border-r border-border shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Верхняя часть меню: Логотип + Крестик */}
              <div className="p-5 space-y-5 shrink-0">
                <div className="flex items-center justify-between">
                  <Link
                    href="/overview"
                    prefetch={false}
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

              </div>

              {/* Список навигации */}
              <nav className="flex-1 overflow-y-auto flex flex-col divide-y divide-border/40 px-5">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href.split('#')[0] ||
                      (item.href !== '/overview' && pathname.startsWith(item.href.split('#')[0]));

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.2 }}
                      >
                        <Link
                          href={item.href}
                          prefetch={false}
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

              {/* Нижний подвал меню */}
              <div className="p-5 border-t border-border/80 space-y-4 bg-surface-2/30 shrink-0">
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
                  {true && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        handleRefresh();
                      }}
                      disabled={refreshInProgress}
                      aria-busy={refreshInProgress}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface border border-border text-primary text-xs font-bold shadow-xs hover:bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                      <motion.span
                        key={refreshAnimationKey}
                        initial={{ rotate: 0 }}
                        animate={refreshInProgress ? { rotate: 360 } : { rotate: 0 }}
                        transition={
                          refreshInProgress
                            ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                            : { duration: 0.65, ease: 'easeInOut' }
                        }
                        className="inline-flex"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-accent" />
                      </motion.span>
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
              <Link href="/overview" prefetch={false} className="flex items-center gap-3 group">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.15 }}
                  className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-black text-base shadow-sm"
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
                  pathname === item.href.split('#')[0] ||
                  (item.href !== '/overview' && pathname.startsWith(item.href.split('#')[0]));

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
                      prefetch={false}
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
            {true && (
              <motion.button
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  handleRefresh();
                }}
                disabled={refreshInProgress}
                aria-busy={refreshInProgress}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent text-white hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-medium transition-all cursor-pointer shadow-xs"
              >
                <motion.span
                  key={refreshAnimationKey}
                  initial={{ rotate: 0 }}
                  animate={refreshInProgress ? { rotate: 360 } : { rotate: 0 }}
                  transition={
                    refreshInProgress
                      ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                      : { duration: 0.65, ease: 'easeInOut' }
                  }
                  className="inline-flex"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </motion.span>
                <span>{refreshInProgress ? 'Синхронизация...' : 'Обновить данные'}</span>
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
