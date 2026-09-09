'use client';

import React from 'react';

export const RegionMap: React.FC = () => (
  <div className="h-72 rounded-2xl bg-surface border border-border flex flex-col items-center justify-center text-secondary text-xs text-center p-6 space-y-2 shadow-sm">
    <span className="text-xl">🗺️</span>
    <p className="font-semibold text-primary">Интерактивная карта областей Узбекистана</p>
    <p className="text-secondary max-w-md">
      Карта в разработке: нужен точный справочник соответствия регионов main_base и GeoJSON-границ
      областей Узбекистана. Пришлите справочник (СПРАВОЧНИК_ГЕО из Power BI), чтобы включить карту.
    </p>
  </div>
);
