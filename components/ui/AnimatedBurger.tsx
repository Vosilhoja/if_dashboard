'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface BurgerMenuItem {
  title: string;
  href: string;
  badge?: string;
  description?: string;
}

interface AnimatedBurgerProps {
  items?: BurgerMenuItem[];
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  className?: string;
}

const DEFAULT_ITEMS: BurgerMenuItem[] = [
  { title: 'Главная панель', href: '/', description: 'Ключевые показатели и сводка' },
  { title: 'Аналитика и графики', href: '/analytics', description: 'Тренды, конверсии и воронка' },
  { title: 'Карта регионов', href: '/map', description: 'География доставок и заявок' },
  { title: 'Таблица данных', href: '/raw', description: 'Полный журнал транзакций' },
  { title: 'AI Ассистент', href: '/chat', badge: 'PRO', description: 'Нейросетевой анализ Google Таблиц' },
  { title: 'Настройки', href: '/settings', description: 'Параметры системы и темы' },
];

/**
 * AnimatedBurger
 * 
 * Высокопроизводительный компонент бургер-меню (60+ FPS):
 * - Морфинг трех линий SVG в идеальный крестик без перерисовок (GPU Transform).
 * - Stagger-анимация появления пунктов меню с использованием CSS-переменных и аппаратных 3D-сдвигов.
 * - Полная SSR-изоляция ('use client').
 */
export const AnimatedBurger: React.FC<AnimatedBurgerProps> = ({
  items = DEFAULT_ITEMS,
  isOpen: controlledIsOpen,
  onToggle,
  className = '',
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;

  const handleToggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onToggle?.(next);
  };

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        if (!isControlled) setInternalOpen(false);
        onToggle?.(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isControlled, onToggle]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Кнопка-триггер с аппаратным морфингом SVG линий */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        className="group relative z-50 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/80 border border-slate-700/60 text-slate-100 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-indigo-500/50 hover:bg-slate-800/90 hover:shadow-indigo-500/10 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="overflow-visible"
        >
          {/* Верхняя полоса: смещение в центр (Y+6px) и поворот на 45deg */}
          <line
            x1="3"
            y1="6"
            x2="21"
            y2="6"
            className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center"
            style={{
              transform: open ? 'translate3d(0, 6px, 0) rotate(45deg)' : 'translate3d(0, 0, 0) rotate(0deg)',
              transformOrigin: '12px 6px',
              willChange: 'transform',
            }}
          />

          {/* Средняя полоса: горизонтальное сжатие до 0 и растворение opacity */}
          <line
            x1="3"
            y1="12"
            x2="21"
            y2="12"
            className="transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center"
            style={{
              opacity: open ? 0 : 1,
              transform: open ? 'scaleX(0)' : 'scaleX(1)',
              transformOrigin: '12px 12px',
              willChange: 'transform, opacity',
            }}
          />

          {/* Нижняя полоса: смещение в центр (Y-6px) и поворот на -45deg */}
          <line
            x1="3"
            y1="18"
            x2="21"
            y2="18"
            className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center"
            style={{
              transform: open ? 'translate3d(0, -6px, 0) rotate(-45deg)' : 'translate3d(0, 0, 0) rotate(0deg)',
              transformOrigin: '12px 18px',
              willChange: 'transform',
            }}
          />
        </svg>
      </button>

      {/* Оверлей-бэкдроп для клика вне меню */}
      {open && (
        <div
          onClick={() => {
            if (!isControlled) setInternalOpen(false);
            onToggle?.(false);
          }}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
          style={{ willChange: 'opacity' }}
        />
      )}

      {/* Выпадающее меню со Stagger появлением */}
      <div
        className={`absolute right-0 mt-3 w-80 z-50 rounded-2xl bg-slate-900/95 border border-slate-700/80 p-3 shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-right ${
          open
            ? 'pointer-events-auto opacity-100 scale-100 translate-y-0'
            : 'pointer-events-none opacity-0 scale-95 -translate-y-3'
        }`}
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-2">
          <span>Навигация системы</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">ESC</span>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (!isControlled) setInternalOpen(false);
                onToggle?.(false);
              }}
              className="group flex flex-col px-3.5 py-2.5 rounded-xl border border-transparent hover:border-indigo-500/30 hover:bg-indigo-600/10 transition-all duration-200"
              style={{
                transitionDelay: open ? `${idx * 45}ms` : '0ms',
                transform: open ? 'translate3d(0, 0, 0)' : 'translate3d(12px, 0, 0)',
                opacity: open ? 1 : 0,
                willChange: 'transform, opacity',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                  {item.title}
                </span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30">
                    {item.badge}
                  </span>
                )}
              </div>
              {item.description && (
                <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                  {item.description}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};
