'use client';

import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

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
    return <Skeleton className="h-72" />;
  }

  if (!quality) {
    return (
      <div className="h-72 rounded-2xl bg-surface border border-border flex items-center justify-center text-secondary text-sm">
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
    <div className="h-72 rounded-2xl bg-surface border border-border p-4 flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <h4 className="text-xs font-bold text-primary tracking-wider uppercase">
            Контроль качества данных (main_base)
          </h4>
        </div>
        <p className="text-[11px] text-secondary mb-4">
          Анализ незаполненных обязательных полей среди {quality.totalRows.toLocaleString()} респондентов
        </p>

        <div className="space-y-2.5">
          {items.map((item) => {
            const pct = ((item.count / quality.totalRows) * 100).toFixed(1);
            return (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-secondary">{item.label}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className={item.count > 0 ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-secondary">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-border text-[10px] text-secondary flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>Пустые поля исключаются из аналитических срезов автоматически</span>
      </div>
    </div>
  );
};
