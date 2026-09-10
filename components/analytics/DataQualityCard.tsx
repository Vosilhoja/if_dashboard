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
  const [warnThreshold, setWarnThreshold] = React.useState(10);
  const [critThreshold, setCritThreshold] = React.useState(20);

  React.useEffect(() => {
    try {
      const savedWarn = localStorage.getItem('hurmo_quality_warn');
      if (savedWarn) setWarnThreshold(parseInt(savedWarn, 10));
      const savedCrit = localStorage.getItem('hurmo_quality_crit');
      if (savedCrit) setCritThreshold(parseInt(savedCrit, 10));
    } catch {
      // ignore in SSR
    }
  }, []);

  if (loading) {
    return <Skeleton className="h-80 rounded-[8px]" />;
  }

  if (!quality) {
    return (
      <div className="h-80 rounded-[8px] bg-surface border border-border flex items-center justify-center text-secondary text-xs">
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
    <div className="h-80 rounded-[8px] bg-surface border border-border p-3.5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
          <h4 className="text-xs font-semibold text-primary">
            Контроль качества данных (main_base)
          </h4>
        </div>
        <p className="text-[11px] text-secondary mb-3">
          Анализ незаполненных обязательных полей среди <span className="tabular-nums font-medium text-primary">{quality.totalRows.toLocaleString()}</span> строк
        </p>

        <div className="space-y-2">
          {items.map((item) => {
            const numPct = quality.totalRows > 0 ? (item.count / quality.totalRows) * 100 : 0;
            const pct = numPct.toFixed(1);
            const colorClass =
              numPct >= critThreshold
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : numPct >= warnThreshold
                ? 'text-amber-500 font-medium'
                : 'text-primary font-medium';

            return (
              <div key={item.label} className="flex items-center justify-between text-xs py-0.5 border-b border-border/50 last:border-0">
                <span className="text-secondary">{item.label}</span>
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className={colorClass}>
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-secondary">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2.5 border-t border-border text-[10px] text-secondary flex items-center gap-1.5">
        <AlertCircle className="w-3 h-3 text-secondary shrink-0" />
        <span>Пустые поля исключаются из срезов автоматически</span>
      </div>
    </div>
  );
};
