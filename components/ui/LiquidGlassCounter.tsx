'use client';

import React, { useEffect, useState, useRef, useId } from 'react';

interface LiquidGlassCounterProps {
  value: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  durationMs?: number;
}

/**
 * LiquidGlassCounter
 * 
 * Компонент счетчика с эффектом "жидкого стекла" / "капли ртути":
 * - Аппаратный SVG-фильтр <feGaussianBlur> + <feColorMatrix> (gooey/metaball)
 *   на уровне GPU без лишних перерисовок DOM.
 * - При смене value старое число деформируется и плавно "втекает" в новое.
 * - Изолирован в 'use client', не ломает SSR (уникальный dynamic filter id через useId).
 */
export const LiquidGlassCounter: React.FC<LiquidGlassCounterProps> = ({
  value,
  label,
  prefix = '',
  suffix = '',
  className = '',
  durationMs = 500,
}) => {
  const [currentVal, setCurrentVal] = useState(value);
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [isMorphing, setIsMorphing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Уникальный ID фильтра для изоляции множественных экземпляров на одной странице
  const rawId = useId();
  const filterId = `liquid-goo-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    if (value !== currentVal) {
      setPrevVal(currentVal);
      setCurrentVal(value);
      setIsMorphing(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        setIsMorphing(false);
        setPrevVal(null);
      }, durationMs);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, currentVal, durationMs]);

  const isUp = prevVal !== null && currentVal > prevVal;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-2xl backdrop-blur-xl select-none transition-all duration-300 hover:border-slate-700/80 ${className}`}
    >
      {/* 
        GPU Metaball SVG Filter:
        feGaussianBlur размывает границы, feColorMatrix сжимает alpha-канал (19 * A - 9),
        заставляя соприкасающиеся цифры сливаться в единую вязкую каплю.
      */}
      <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  
                      0 1 0 0 0  
                      0 0 1 0 0  
                      0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {label && (
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-2">
          {label}
        </span>
      )}

      {/* Контейнер с применением фильтра жидкого стекла */}
      <div
        className="relative flex items-center justify-center h-16 min-w-[130px] px-4"
        style={{
          filter: isMorphing ? `url(#${filterId})` : 'none',
          willChange: isMorphing ? 'filter, transform' : 'auto',
        }}
      >
        {prefix && (
          <span className="text-2xl font-bold text-slate-400 mr-2 tracking-tight">
            {prefix}
          </span>
        )}

        <div className="relative flex items-center justify-center font-mono font-extrabold text-5xl tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400">
          {/* Старая цифра (уплывает и тает в капле) */}
          {isMorphing && prevVal !== null && (
            <span
              className="absolute transition-all ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transitionDuration: `${durationMs}ms`,
                opacity: 0,
                transform: isUp ? 'translate3d(0, -20px, 0) scale(0.85)' : 'translate3d(0, 20px, 0) scale(0.85)',
                filter: 'blur(2px)',
                willChange: 'transform, opacity, filter',
              }}
            >
              {prevVal.toLocaleString()}
            </span>
          )}

          {/* Новая цифра (втекает и стабилизируется) */}
          <span
            className="inline-block transition-all ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              transitionDuration: `${durationMs}ms`,
              opacity: 1,
              transform: isMorphing
                ? 'translate3d(0, 0, 0) scale(1.05)'
                : 'translate3d(0, 0, 0) scale(1)',
              filter: isMorphing ? 'blur(0.5px)' : 'none',
              willChange: 'transform, opacity',
            }}
          >
            {currentVal.toLocaleString()}
          </span>
        </div>

        {suffix && (
          <span className="text-2xl font-bold text-slate-400 ml-2 tracking-tight">
            {suffix}
          </span>
        )}
      </div>

      {/* Индикатор синхронизации */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full transition-colors duration-300 ${
            isMorphing ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-emerald-500/60'
          }`}
        />
        <span className="text-[11px] font-medium text-slate-400">
          {isMorphing ? 'Жидкий морфинг...' : 'Синхронизировано'}
        </span>
      </div>
    </div>
  );
};
