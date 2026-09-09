'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AgeBin } from '@/lib/age-utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { useTheme } from '@/lib/theme-context';

interface Props {
  ageBins: Record<AgeBin, { Мужской: number; Женский: number }> | null;
  averageAge: number | null;
  loading: boolean;
}

export const AgePyramidChart: React.FC<Props> = ({ ageBins, averageAge, loading }) => {
  const { selectedRegion } = useAnalyticsFilter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (loading) {
    return <Skeleton className="h-72" />;
  }

  if (!ageBins) {
    return (
      <div className="h-72 rounded-2xl bg-surface border border-border flex items-center justify-center text-secondary text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const data = Object.entries(ageBins).map(([bin, counts]) => ({
    bin,
    Мужской: counts.Мужской,
    Женский: counts.Женский,
    Всего: counts.Мужской + counts.Женский,
  }));

  const axisTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="h-72 rounded-2xl bg-surface border border-border p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-xs font-bold text-primary tracking-wider uppercase">
            Возрастные группы и пол
          </h4>
          {selectedRegion && (
            <span className="text-[10px] text-secondary">
              Регион: {selectedRegion}
            </span>
          )}
        </div>
        {averageAge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
            Ср. возраст: {averageAge} лет
          </span>
        )}
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="bin" tick={{ fill: axisTextColor, fontSize: 11 }} />
            <YAxis tick={{ fill: axisTextColor, fontSize: 11 }} />
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
              formatter={(value) => <span className="text-xs text-secondary">{value}</span>}
            />
            <Bar dataKey="Мужской" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Женский" fill="#ec4899" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
