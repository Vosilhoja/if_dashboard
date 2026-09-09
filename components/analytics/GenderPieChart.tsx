'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { useTheme } from '@/lib/theme-context';

interface Props {
  genderCount: { Мужской: number; Женский: number } | null;
  loading: boolean;
}

const COLORS = { Мужской: '#3b82f6', Женский: '#ec4899' };

export const GenderPieChart: React.FC<Props> = ({ genderCount, loading }) => {
  const { selectedGender, setSelectedGender, selectedRegion } = useAnalyticsFilter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const total = (genderCount?.Мужской || 0) + (genderCount?.Женский || 0);

  const data = useMemo(() => {
    if (!genderCount) return [];
    return [
      { name: 'Мужской', value: genderCount.Мужской },
      { name: 'Женский', value: genderCount.Женский },
    ];
  }, [genderCount]);

  if (loading) {
    return <Skeleton className="h-72" />;
  }

  if (!genderCount || total === 0) {
    return (
      <div className="h-72 rounded-2xl bg-surface border border-border flex items-center justify-center text-secondary text-sm">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="h-72 rounded-2xl bg-surface border border-border p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-primary tracking-wider uppercase">
          Распределение по полу
        </h4>
        <div className="flex items-center gap-1.5">
          {selectedRegion && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-secondary border border-border">
              {selectedRegion}
            </span>
          )}
          {selectedGender && (
            <button
              onClick={() => setSelectedGender(null)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer"
              title="Сбросить фильтр по полу"
            >
              {selectedGender} ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
              onClick={(entry) => {
                const clicked = entry.name as 'Мужской' | 'Женский';
                setSelectedGender(selectedGender === clicked ? null : clicked);
              }}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[entry.name as keyof typeof COLORS]}
                  opacity={selectedGender && selectedGender !== entry.name ? 0.35 : 1}
                  stroke={isDark ? '#10151f' : '#ffffff'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(val) =>
                val !== undefined && val !== null ? Number(val).toLocaleString('ru-RU') : '0'
              }
              contentStyle={{
                backgroundColor: isDark ? '#10151f' : '#ffffff',
                borderColor: isDark ? '#1f2733' : '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: isDark ? '#f1f5f9' : '#0f172a',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer">
                  {value} ({((((genderCount?.[value as 'Мужской' | 'Женский'] || 0) / total) * 100) || 0).toFixed(1)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
