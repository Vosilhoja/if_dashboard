'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ArrowUpRight } from 'lucide-react';

export const RegionMap: React.FC = () => (
  <Link
    href="/map"
    className="h-64 rounded-[8px] bg-surface border border-border hover:border-accent flex flex-col items-center justify-center text-center p-4 space-y-2 transition-colors cursor-pointer group shadow-xs"
  >
    <div className="p-2.5 rounded-full bg-accent/10 text-accent group-hover:scale-110 transition-transform">
      <MapPin className="w-5 h-5" />
    </div>
    <p className="font-semibold text-primary text-sm">Интерактивная карта областей Узбекистана</p>
    <p className="text-secondary text-[11px] leading-relaxed max-w-sm">
      Полная векторная карта с разбивкой по регионам и районам, кликабельными зонами и синхронизацией с текущими фильтрами
    </p>
    <span className="flex items-center gap-1 text-accent text-xs font-medium group-hover:underline">
      Открыть карту
      <ArrowUpRight className="w-3.5 h-3.5" />
    </span>
  </Link>
);
