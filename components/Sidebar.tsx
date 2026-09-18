'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAuth, hasMinRole, normalizeRole } from '@/lib/auth-context';

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
    label: 'Таблицы',
    subtitle: 'Все 5 таблиц Google',
    icon: Database,
    minRole: 'operator',
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

const tableNavItems = [
  { href: '/raw/numbers', label: 'Номера поддержки' },
  { href: '/raw/main-base', label: 'Main base' },
  { href: '/raw/eskiz', label: 'Eskiz' },
  { href: '/raw/not_completed', label: 'Не завершили' },
  { href: '/raw/survey_attempts', label: 'Попытки опроса' },
];

const syncTableLabels: Record<string, string> = {
  main: 'Main base',
  numbers: 'Номера поддержки',
  eskiz: 'Eskiz',
  not_completed: 'Не завершили',
  survey_attempts: 'Попытки опроса',
};

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
  const [syncStatus, setSyncStatus] = useState<{ active: boolean; current: number; total: number; label: string | null; error: string | null }>({
    active: false, current: 0, total: 5, label: null, error: null,
  });
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [brandHovered, setBrandHovered] = useState(false);
  const [syncNoticeVisible, setSyncNoticeVisible] = useState(false);
  const [autoRefreshVersion, setAutoRefreshVersion] = useState(0);
  const [tablesOpen, setTablesOpen] = useState(() => pathname.startsWith('/raw'));
  const resizingRef = useRef(false);
  const syncNoticeTimerRef = useRef<number | null>(null);
  const refreshInProgress = isRefreshing || localRefreshInProgress;
  const isCompact = sidebarCollapsed;
  const isTablesActive = pathname.startsWith('/raw');

  const handleRefresh = async () => {
    if (refreshInProgress) return;
    if (syncNoticeTimerRef.current !== null) {
      window.clearTimeout(syncNoticeTimerRef.current);
      syncNoticeTimerRef.current = null;
    }
    setLocalRefreshInProgress(true);
    setSyncNoticeVisible(true);
    setSyncStatus({
      active: true,
      current: 0,
      total: 5,
      label: 'Подготовка',
      error: null,
    });
    setRefreshAnimationKey((key) => key + 1);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 180_000);
    let syncSucceeded = false;
    try {
      // Synchronize all source sheets once. Normal dashboard requests only
      // read the backend snapshot and never contact Google Sheets.
      const response = await fetch('/api/proxy/data/sync', {
        method: 'POST',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      // Refresh all open dashboard/table views as soon as the five sheets are
      // synchronized; status classification is a separate background task.
      window.dispatchEvent(new CustomEvent('hurmo:sync'));
      void (async () => {
        try {
        const classifyResponse = await fetch('/api/proxy/admin/statuses/classify-unmatched', {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
        });
        const classifyData = await classifyResponse.json().catch(() => ({}));
        if (!classifyResponse.ok) {
          console.warn('[Sidebar] unmatched classification was not queued:', classifyData.error);
        }
        } catch (classificationError) {
          if (!(classificationError instanceof DOMException && classificationError.name === 'AbortError')) {
            console.warn('[Sidebar] unmatched classification failed:', classificationError);
          }
        }
      })();
      syncSucceeded = true;
    } catch (error) {
      setSyncStatus((current) => ({
        ...current,
        active: false,
        error: error instanceof DOMException && error.name === 'AbortError'
          ? 'Синхронизация превысила лимит времени'
          : 'Не удалось синхронизировать данные',
      }));
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('[Sidebar] sync failed', error);
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLocalRefreshInProgress(false);
      if (syncSucceeded) {
        setSyncStatus((current) => ({
          ...current,
          active: false,
          current: current.total,
          label: 'Завершено',
          error: null,
        }));
      }
      syncNoticeTimerRef.current = window.setTimeout(() => {
        setSyncNoticeVisible(false);
        syncNoticeTimerRef.current = null;
      }, 2000);
    }
  };

  useEffect(() => () => {
    if (syncNoticeTimerRef.current !== null) {
      window.clearTimeout(syncNoticeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const savedWidth = Number(window.localStorage.getItem('hurmo-sidebar-width'));
    if (Number.isFinite(savedWidth)) setSidebarWidth(Math.min(400, Math.max(240, savedWidth)));
    setSidebarCollapsed(window.localStorage.getItem('hurmo-sidebar-collapsed') === 'true');
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem('hurmo-sidebar-collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!refreshInProgress) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const response = await fetch('/api/proxy/data/sync/status', { cache: 'no-store' });
        if (response.ok && !cancelled) {
          const nextStatus = await response.json();
          setSyncStatus((current) => ({
            ...nextStatus,
            // Never let a delayed response move the visible progress backwards.
            current: Math.max(current.current, Number(nextStatus.current) || 0),
            total: Number(nextStatus.total) || current.total,
            error: nextStatus.error || current.error,
          }));
        }
      } catch {
        // The sync request itself remains the source of truth if polling is unavailable.
      }
      if (!cancelled) timer = window.setTimeout(poll, 2500);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [refreshInProgress]);

  useEffect(() => {
    const handleSettingsChange = () => setAutoRefreshVersion((version) => version + 1);
    window.addEventListener('hurmo:auto-refresh-changed', handleSettingsChange);
    return () => window.removeEventListener('hurmo:auto-refresh-changed', handleSettingsChange);
  }, []);

  useEffect(() => {
    const intervalMinutes = Number(window.localStorage.getItem('hurmo_auto_refresh_interval') || '0');
    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) return;

    const timer = window.setInterval(() => {
      if (!refreshInProgress) void handleRefresh();
    }, intervalMinutes * 60_000);

    return () => window.clearInterval(timer);
  }, [autoRefreshVersion, refreshInProgress]);

  const syncLabel = syncStatus.error
    ? 'Ошибка синхронизации'
    : !refreshInProgress && syncStatus.current >= syncStatus.total && syncStatus.label === 'Завершено'
      ? 'Синхронизация завершена'
    : syncStatus.current > 0 && syncStatus.label
      ? `Загрузка таблицы: ${syncTableLabels[syncStatus.label] || syncStatus.label} ${syncStatus.current}/${syncStatus.total}`
      : refreshInProgress
        ? `Подготовка синхронизации 0/${syncStatus.total}`
        : 'Синхронизация завершена';
  const compactSyncLabel = syncStatus.error
    ? 'Ошибка'
    : `${Math.min(syncStatus.current, syncStatus.total)}/${syncStatus.total}`;

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      const next = Math.min(400, Math.max(240, event.clientX));
      setSidebarWidth(next);
      window.localStorage.setItem('hurmo-sidebar-width', String(next));
    };
    const stop = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.classList.remove('sidebar-resizing');
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };
  }, []);

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
      <header className="xl:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-surface/90 backdrop-blur-xl border-b border-border/70 shadow-sm transition-all">
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
        <div className="flex items-center gap-1.5 min-w-0">
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
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 bg-black/70 xl:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full md:w-[40vw] md:max-w-none h-full bg-surface border-r border-border shadow-2xl flex flex-col transform-gpu will-change-transform"
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

              </div>

              {/* Список навигации */}
              <nav className="flex-1 overflow-y-auto flex flex-col divide-y divide-border/40 px-5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href.split('#')[0] ||
                      (item.href !== '/overview' && pathname.startsWith(item.href.split('#')[0]));

                    return (
                      <div
                        key={item.href}
                      >
                        {item.href === '/raw' ? (
                        <button
                          type="button"
                          onClick={() => setTablesOpen((open) => !open)}
                          className={`flex w-full items-center justify-between py-3.5 px-2 transition-all active:bg-surface-2/80 group ${
                            isTablesActive ? 'text-accent font-bold' : 'text-primary font-medium'
                          }`}
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isTablesActive ? 'bg-accent text-white' : 'bg-surface-2 text-secondary'}`}>
                              <Database className="w-4 h-4" />
                            </span>
                            <span className="text-sm tracking-tight">{item.label}</span>
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${tablesOpen ? 'rotate-180' : ''}`} />
                        </button>
                        ) : <Link
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
                                  : 'bg-surface-2 text-secondary group-hover:text-primary'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className={`flex flex-col min-w-0 ${sidebarWidth <= 100 ? 'hidden' : ''}`}>
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
                        </Link>}
                        {item.href === '/raw' && tablesOpen && (
                          <div className="ml-10 mr-2 mb-2 space-y-1">
                            {tableNavItems.map((table) => (
                              <Link key={table.href} href={table.href} onClick={() => setMobileDrawerOpen(false)}
                                className={`block rounded-lg px-3 py-2 text-xs ${pathname === table.href ? 'bg-accent/15 text-accent font-semibold' : 'text-secondary hover:bg-surface-2 hover:text-primary'}`}>
                                {table.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
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
                {syncNoticeVisible && (
                  <div
                    aria-live="polite"
                    className={`flex h-10 w-full items-center justify-center rounded-2xl border px-3 text-xs font-bold truncate ${
                      syncStatus.error
                        ? 'border-rose-400/40 bg-rose-500/10 text-rose-400'
                        : 'border-accent/30 bg-accent/10 text-accent'
                    }`}
                  >
                    {syncLabel}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  {true && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
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
                      <span className="truncate">Синхронизация</span>
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
      <aside
        style={{ width: sidebarCollapsed ? 60 : sidebarWidth }}
        className="hidden xl:flex relative flex-col shrink-0 h-screen sticky top-0 bg-surface border-r border-border overflow-y-auto transition-[width] duration-300 ease-in-out rounded-tr-2xl rounded-br-2xl"
      >
        <div className={`flex flex-col h-full justify-between bg-surface select-none ${isCompact ? 'p-2' : 'p-4'}`}>
          <div className="space-y-5">
            {/* Brand Header */}
            <div className={`flex items-center justify-between pb-3.5 border-b border-border/80 ${isCompact ? 'justify-center' : ''}`}>
              <Link
                href="/overview"
                prefetch={false}
                draggable={false}
                onClick={(event) => {
                  if (isCompact) {
                    event.preventDefault();
                    toggleSidebarCollapsed();
                  }
                }}
                className={`flex items-center gap-3 group ${isCompact ? 'justify-center' : ''}`}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.15 }}
                  className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-black text-base shadow-sm"
                  onMouseEnter={() => setBrandHovered(true)}
                  onMouseLeave={() => setBrandHovered(false)}
                >
                  {isCompact && brandHovered ? <PanelLeftOpen className="h-4 w-4" /> : 'H'}
                </motion.div>
                <div className={`flex flex-col min-w-0 ${isCompact ? 'hidden' : ''}`}>
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
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                aria-label={isCompact ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
                title={isCompact ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
                className="shrink-0 rounded-lg p-1.5 text-secondary transition-colors hover:bg-surface-2 hover:text-primary"
              >
                {isCompact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
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
                    {item.href === '/raw' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompact) setSidebarCollapsed(false);
                        setTablesOpen((open) => !open);
                      }}
                      title={isCompact ? 'Таблицы' : undefined}
                      className={`w-full flex items-center gap-3 ${isCompact ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl text-left transition-colors duration-150 cursor-pointer group ${
                        isTablesActive ? 'bg-accent text-white font-semibold shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface-2 font-medium'
                      }`}
                    >
                      <Database className="w-4 h-4 shrink-0" />
                      <span className={`text-xs truncate flex-1 ${isCompact ? 'hidden' : ''}`}>{item.label}</span>
                      {!isCompact && <ChevronDown className={`w-4 h-4 transition-transform ${tablesOpen ? 'rotate-180' : ''}`} />}
                    </button>
                    ) : <Link
                      href={item.href}
                      prefetch={false}
                      draggable={false}
                      title={isCompact ? item.label : undefined}
                      className={`w-full flex items-center gap-3 ${isCompact ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl text-left transition-colors duration-150 cursor-pointer group ${
                        isActive
                          ? 'bg-accent text-white font-semibold shadow-xs'
                          : 'text-secondary hover:text-primary hover:bg-surface-2 font-medium'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className={`text-xs truncate flex-1 ${isCompact ? 'hidden' : ''}`}>{item.label}</span>
                      {item.badge && !isCompact && (
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
                    </Link>}
                    {item.href === '/raw' && tablesOpen && !isCompact && (
                      <div className="ml-7 mt-1 mb-2 space-y-1 border-l border-border pl-2">
                        {tableNavItems.map((table) => (
                          <Link key={table.href} href={table.href}
                            className={`block rounded-lg px-3 py-2 text-[11px] ${pathname === table.href ? 'bg-accent/15 text-accent font-semibold' : 'text-secondary hover:bg-surface-2 hover:text-primary'}`}>
                            {table.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </nav>
          </div>

          {/* Desktop Footer */}
          <div className={`pt-3 border-t border-border/80 space-y-2.5 ${isCompact ? 'space-y-3' : ''}`}>
            {true && (
              <>
              {syncNoticeVisible && (
                <div
                  aria-live="polite"
                  title={isCompact ? syncLabel : undefined}
                  className={`mb-2 flex h-10 w-full items-center justify-center rounded-xl border px-2 text-xs font-medium truncate ${
                    syncStatus.error
                      ? 'border-rose-400/40 bg-rose-500/10 text-rose-400'
                      : 'border-accent/30 bg-accent/10 text-accent'
                  }`}
                >
                  {isCompact ? compactSyncLabel : syncLabel}
                </div>
              )}
              <motion.button
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  handleRefresh();
                }}
                disabled={refreshInProgress}
                aria-busy={refreshInProgress}
                title={isCompact ? 'Обновить данные' : undefined}
                className={`w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-white hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-medium transition-all cursor-pointer shadow-xs ${isCompact ? 'px-2 py-2.5' : 'px-3 py-2'}`}
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
                <span className={`truncate ${isCompact ? 'hidden' : ''}`}>
                  {refreshInProgress ? 'Синхронизация...' : 'Обновить данные'}
                </span>
              </motion.button>
              </>
            )}

            <div className={`flex items-center text-[11px] text-secondary ${isCompact ? 'flex-col gap-2' : 'justify-between'}`}>
              <div className={`flex items-center gap-1.5 truncate ${isCompact ? 'hidden' : ''}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Сессия защищена</span>
              </div>
              <div className={`flex items-center ${isCompact ? 'flex-col gap-2' : 'gap-1'}`}>
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
        <div
          role="separator"
          aria-label="Изменить ширину боковой панели"
          onMouseDown={(event) => {
            if (isCompact) return;
            event.preventDefault();
            resizingRef.current = true;
            document.body.classList.add('sidebar-resizing');
          }}
          className="absolute right-0 top-0 z-20 h-full w-2 cursor-col-resize hover:bg-accent/50 transition-colors"
        />
      </aside>
    </>
  );
};
