'use client';

import React, { useState } from 'react';
import { AnimatedBurger } from '@/components/ui/AnimatedBurger';
import { LiquidGlassCounter } from '@/components/ui/LiquidGlassCounter';
import { 
  Sparkles, 
  RefreshCw, 
  Plus, 
  Minus, 
  Zap, 
  Flame, 
  Activity, 
  ShieldCheck, 
  Layers,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

export default function DemoAnimationsPage() {
  const [counterValue, setCounterValue] = useState<number>(2480);
  const [secondaryVal, setSecondaryVal] = useState<number>(98);
  const [revenueVal, setRevenueVal] = useState<number>(142500);
  const [speedMs, setSpeedMs] = useState<number>(500);

  const randomizeAll = () => {
    setCounterValue(Math.floor(Math.random() * 9000) + 1000);
    setSecondaryVal(Math.floor(Math.random() * 40) + 70);
    setRevenueVal(Math.floor(Math.random() * 300000) + 50000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 md:p-12 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Декоративные плавающие световые пятна (GPU accelerated) */}
      <div className="absolute -top-40 -left-40 w-[550px] h-[550px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none animate-glow" />
      <div className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-violet-600/15 blur-[140px] pointer-events-none animate-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute -bottom-40 left-1/4 w-[550px] h-[550px] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none" />

      {/* Верхний бар с анимированным логотипом и AnimatedBurger */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 px-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-lg relative z-30 mb-8 animate-fade-in hover-lift">
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wide text-white">
                HURMO MOTION ENGINE
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                60+ FPS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              GPU-Accelerated Morphing & Stagger Architecture
            </p>
          </div>
        </div>

        {/* Интеграция бургер-меню */}
        <AnimatedBurger />
      </header>

      {/* Основная сетка интерактивных анимированных блоков */}
      <main className="w-full max-w-5xl flex flex-col items-center gap-8 relative z-10">
        
        {/* Заголовок с плавной анимацией появления */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold shadow-inner transition-transform duration-300 hover:scale-105">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>SVG feColorMatrix + feGaussianBlur Liquid Glass</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Живые перетекания и кинетика
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Интерактивные микро-взаимодействия с аппаратным ускорением видеокарты (Zero Reflow). Никаких лагов и просадок FPS.
          </p>
        </div>

        {/* 3 интерактивных счетчика с эффектом жидкого стекла */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-fade-in" style={{ animationDelay: '100ms' }}>
          
          {/* Счетчик 1: Заказы */}
          <div className="hover-lift rounded-3xl group">
            <LiquidGlassCounter
              value={counterValue}
              label="Заказы в обработке"
              suffix="ед."
              durationMs={speedMs}
              className="w-full border-indigo-500/20 group-hover:border-indigo-500/50"
            />
          </div>

          {/* Счетчик 2: Конверсия */}
          <div className="hover-lift rounded-3xl group">
            <LiquidGlassCounter
              value={secondaryVal}
              label="Коэффициент успеха"
              prefix="%"
              durationMs={speedMs}
              className="w-full border-violet-500/20 group-hover:border-violet-500/50"
            />
          </div>

          {/* Счетчик 3: Выручка */}
          <div className="hover-lift rounded-3xl group">
            <LiquidGlassCounter
              value={revenueVal}
              label="Объем продаж за день"
              suffix="UZS"
              durationMs={speedMs}
              className="w-full border-cyan-500/20 group-hover:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Панель управления и триггеров анимаций */}
        <div className="flex flex-col items-center gap-5 w-full max-w-xl p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl hover-lift animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Консоль тестирования морфинга
            </span>
            <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
              Синхронизация GPU
            </span>
          </div>

          {/* Кнопки изменения цифр со пружинящей анимацией :active */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setCounterValue((v) => Math.max(0, v - 100))}
              className="active-press flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/60 text-xs font-semibold text-slate-200 transition-all hover:shadow-lg shadow-sm"
            >
              <Minus className="w-3.5 h-3.5" /> -100
            </button>

            <button
              onClick={() => setCounterValue((v) => v + 150)}
              className="active-press flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/60 text-xs font-semibold text-slate-200 transition-all hover:shadow-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> +150
            </button>

            <button
              onClick={() => setCounterValue((v) => v + 650)}
              className="active-press flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:shadow-indigo-600/50"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300 animate-bounce" /> +650 (Ртутная волна)
            </button>

            <button
              onClick={randomizeAll}
              className="active-press flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 border border-violet-500/40 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Случайно все 3
            </button>
          </div>

          {/* Регулятор длительности анимации перехода */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80 w-full justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Скорость перетекания:
            </span>
            <div className="flex gap-1.5">
              {[300, 500, 750, 1000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setSpeedMs(ms)}
                  className={`active-press px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    speedMs === ms
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/40'
                  }`}
                >
                  {ms}ms
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Дополнительные карточки UI с micro-animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 w-full mt-2 animate-fade-in" style={{ animationDelay: '300ms' }}>
          
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover-lift flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Zero Reflow Guarantee</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:rotate-12 transition-transform duration-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xl font-bold text-slate-200">100% GPU</span>
              <p className="text-xs text-slate-500 mt-1">
                Все анимации задействуют видеоядро через композитные слои.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover-lift flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">FPS Стабильность</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-125 transition-transform duration-300">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xl font-bold text-slate-200">60 - 120 FPS</span>
              <p className="text-xs text-slate-500 mt-1">
                Гладкая отрисовка кадров без микрофризов и блокировки UI.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover-lift flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">SVG Морфинг</span>
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xl font-bold text-slate-200">feColorMatrix</span>
              <p className="text-xs text-slate-500 mt-1">
                Альфа-шейдер превращает раздельные цифры в единую каплю.
              </p>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
