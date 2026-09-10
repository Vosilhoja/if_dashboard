'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  FileText,
  Settings,
  Moon,
  Sun,
  RotateCcw,
  Phone,
  BarChart2,
  Table,
  ExternalLink,
  Command,
} from 'lucide-react';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { useTheme } from '@/lib/theme-context';
import { REGION_RU_TO_EN } from '@/lib/region-name-map';
import { showToast } from '@/components/ui/Toast';

export function openCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const { setSelectedRegion, resetAllFilters } = useAnalyticsFilter();
  const { theme, toggleTheme } = useTheme();

  // Listen for Cmd+K / Ctrl+K, Esc, and custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Build searchable items list
  const allItems = [
    // Pages
    { id: 'nav-overview', title: 'Главная (Executive Overview)', category: 'Навигация', icon: BarChart2, action: () => router.push('/overview') },
    { id: 'nav-dashboard', title: 'Операционная воронка (Метрики и аномалии)', category: 'Навигация', icon: FileText, action: () => router.push('/dashboard') },
    { id: 'nav-analytics', title: 'BI-аналитика (Демография и срезы)', category: 'Навигация', icon: BarChart2, action: () => router.push('/analytics') },
    { id: 'nav-map', title: 'Интерактивная карта регионов', category: 'Навигация', icon: MapPin, action: () => router.push('/map') },
    { id: 'nav-raw', title: 'Сырые таблицы Google Sheets', category: 'Навигация', icon: Table, action: () => router.push('/raw') },
    { id: 'nav-settings', title: 'Настройки системы', category: 'Навигация', icon: Settings, action: () => router.push('/settings') },

    // Quick Actions
    {
      id: 'act-theme',
      title: theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему',
      category: 'Действия',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        toggleTheme();
        showToast('Тема оформления изменена');
      },
    },
    {
      id: 'act-reset',
      title: 'Сбросить все фильтры дашборда',
      category: 'Действия',
      icon: RotateCcw,
      action: () => {
        resetAllFilters();
        showToast('Все фильтры успешно сброшены');
      },
    },

    // Regions
    ...Object.keys(REGION_RU_TO_EN).map((region) => ({
      id: `region-${region}`,
      title: `Фильтр по региону: ${region}`,
      category: 'Регионы',
      icon: MapPin,
      action: () => {
        setSelectedRegion(region);
        router.push('/analytics');
        showToast(`Выбран регион: ${region}`);
      },
    })),
  ];

  // If user typed digits, add phone search option
  const isPhoneSearch = /^[0-9+()\s-]+$/.test(query.trim()) && query.trim().length >= 3;
  if (isPhoneSearch) {
    allItems.unshift({
      id: 'search-phone',
      title: `Найти телефон «${query.trim()}» в сырых таблицах`,
      category: 'Поиск данных',
      icon: Phone,
      action: () => {
        router.push(`/raw?search=${encodeURIComponent(query.trim())}`);
      },
    });
  }

  const filteredItems = allItems.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  const handleSelect = (index: number) => {
    const item = filteredItems[index];
    if (item) {
      setIsOpen(false);
      item.action();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-100"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-[12px] shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
          <Search className="w-4 h-4 text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск разделов, регионов, номеров или действий... (Ctrl+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            className="w-full bg-transparent text-sm text-primary placeholder-secondary focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-secondary">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondary">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-left transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-accent text-white font-medium shadow-xs'
                      : 'hover:bg-surface-2 text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-white' : 'text-secondary'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-2 text-secondary border border-border'
                    }`}
                  >
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-surface-2/40 border-t border-border flex items-center justify-between text-[11px] text-secondary">
          <div className="flex items-center gap-3">
            <span>↑↓ Навигация</span>
            <span>↵ Выбор</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span>HURMO UZ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
