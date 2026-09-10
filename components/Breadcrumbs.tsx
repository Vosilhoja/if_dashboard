'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, ShieldCheck, FilterX, RotateCcw } from 'lucide-react';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';

const ROUTE_LABELS: Record<string, { title: string; subtitle: string }> = {
  '/overview': {
    title: 'Главная',
    subtitle: 'Сводный обзор ключевых метрик и состояния данных',
  },
  '/dashboard': {
    title: 'Операционная воронка',
    subtitle: 'Анализ звонков, повторов, конверсий и аномалий за период',
  },
  '/analytics': {
    title: 'BI-аналитика',
    subtitle: 'Демография, образование, источники и кросс-фильтрация респондентов',
  },
  '/map': {
    title: 'Карта регионов',
    subtitle: 'Интерактивное географическое распределение и drill-down по областям',
  },
  '/raw': {
    title: 'Сырые таблицы',
    subtitle: 'Прямой просмотр строк Google Таблиц с поиском и экспортом',
  },
  '/settings': {
    title: 'Настройки',
    subtitle: 'Управление источниками данных, порогами аномалий и параметрами',
  },
};

export const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();
  const { hasActiveFilters, resetAllFilters, selectedRegion, selectedDistrict } = useAnalyticsFilter();

  const current = ROUTE_LABELS[pathname] || {
    title: 'Раздел',
    subtitle: 'Аналитический дашборд',
  };

  return (
    <header className="border-b border-border/80 bg-surface/80 backdrop-blur-xs sticky top-0 z-20 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Breadcrumb path */}
        <div className="flex flex-col">
          <nav className="flex items-center gap-1.5 text-xs text-secondary font-medium">
            <Link
              href="/overview"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>HURMO</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-secondary/60 shrink-0" />
            <span className="text-primary font-semibold">{current.title}</span>
          </nav>
          <p className="text-[11px] text-secondary mt-0.5 hidden sm:block">
            {current.subtitle}
          </p>
        </div>

        {/* Action / Status bar */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search / Command Palette trigger */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-command-palette'));
              }
            }}
            className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-surface-2/80 hover:bg-surface-2 border border-border text-xs text-secondary hover:text-primary transition-all cursor-pointer group"
            title="Быстрый поиск и команды (Ctrl+K или Cmd+K)"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-secondary group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline font-medium">Поиск...</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-secondary/70 bg-surface border border-border rounded">
              ⌘K
            </kbd>
          </button>

          {/* Global filter reset action */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 transition-colors cursor-pointer"
              title="Сбросить все активные фильтры (период, регион, демографию)"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Сбросить фильтры</span>
              <span className="sm:hidden">Сброс</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Сессия защищена</span>
          </div>
        </div>
      </div>
    </header>
  );
};
