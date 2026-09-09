'use client';

import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface DataQualityData {
  emptyPhone: number;
  emptyRegion: number;
  emptyAge: number;
  emptyEducation: number;
  emptyProfession: number;
  totalRows: number;
}

interface Props {
  quality: DataQualityData | null;
  loading: boolean;
}

export const DataQualityCard: React.FC<Props> = ({ quality, loading }) => {
  if (loading) {
    return <div className="h-72 rounded-2xl bg-slate-900/60 animate-pulse" />;
  }

  if (!quality) {
    return (
      <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const items = [
    { label: 'Без телефона', count: quality.emptyPhone },
    { label: 'Без региона', count: quality.emptyRegion },
    { label: 'Без возраста', count: quality.emptyAge },
    { label: 'Без образования', count: quality.emptyEducation },
    { label: 'Без профессии', count: quality.emptyProfession },
  ];

  return (
    <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-white tracking-wider uppercase">
            Контроль качества данных (main_base)
          </h4>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          Анализ незаполненных обязательных полей среди {quality.totalRows.toLocaleString()} респондентов
        </p>

        <div className="space-y-2.5">
          {items.map((item) => {
            const pct = ((item.count / quality.totalRows) * 100).toFixed(1);
            return (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{item.label}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className={item.count > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Пустые поля исключаются из аналитических срезов автоматически</span>
      </div>
    </div>
  );
};
