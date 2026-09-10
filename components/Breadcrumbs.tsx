'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, ShieldCheck } from 'lucide-react';

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

        {/* Status chip */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Сессия защищена</span>
          </div>
        </div>
      </div>
    </header>
  );
};
