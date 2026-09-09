'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { useTheme } from '@/lib/theme-context';
import { GENDER_COLORS } from '@/lib/chart-colors';

interface Props {
  genderCount: { Мужской: number; Женский: number } | null;
  loading: boolean;
}

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
    return <Skeleton className="h-64 rounded-[8px]" />;
  }

  if (!genderCount || total === 0) {
    return (
      <div className="h-64 rounded-[8px] bg-surface border border-border flex items-center justify-center text-secondary text-xs">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="h-64 rounded-[8px] bg-surface border border-border p-3.5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-primary">
          Распределение по полу
        </h4>
        <div className="flex items-center gap-1">
          {selectedRegion && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border">
              {selectedRegion}
            </span>
          )}
          {selectedGender && (
            <button
              onClick={() => setSelectedGender(null)}
              className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer"
              title="Сбросить фильтр по полу"
            >
              {selectedGender} ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={68}
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
                  fill={GENDER_COLORS[entry.name as keyof typeof GENDER_COLORS]}
                  opacity={selectedGender && selectedGender !== entry.name ? 0.3 : 1}
                  stroke={isDark ? '#12161F' : '#FFFFFF'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(val) =>
                val !== undefined && val !== null ? Number(val).toLocaleString('ru-RU') : '0'
              }
              contentStyle={{
                backgroundColor: isDark ? '#12161F' : '#FFFFFF',
                borderColor: isDark ? '#1E2430' : '#E7E5E0',
                borderRadius: '6px',
                fontSize: '11px',
                color: isDark ? '#E4E7EC' : '#1C1E21',
                padding: '6px 10px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(value) => (
                <span className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer">
                  {value}{' '}
                  <span className="tabular-nums">
                    ({((((genderCount?.[value as 'Мужской' | 'Женский'] || 0) / total) * 100) || 0).toFixed(1)}%)
                  </span>
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
