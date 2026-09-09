'use client';

import React from 'react';

export const RegionMap: React.FC = () => (
  <div className="h-64 rounded-[8px] bg-surface border border-border flex flex-col items-center justify-center text-secondary text-xs text-center p-4 space-y-1.5">
    <span className="text-lg">🗺️</span>
    <p className="font-semibold text-primary">Интерактивная карта областей Узбекистана</p>
    <p className="text-secondary max-w-sm text-[11px] leading-relaxed">
      Карта в разработке: требуется справочник соответствия регионов main_base и GeoJSON-границ
      областей Узбекистана (СПРАВОЧНИК_ГЕО из Power BI).
    </p>
  </div>
);
