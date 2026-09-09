'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { useTheme } from '@/lib/theme-context';

interface Props {
  dataCounts: Record<string, number> | null;
  title: string;
  loading: boolean;
  barColor?: string;
  limit?: number;
  filterType?: 'education' | 'source';
}

export const CategoryBarChart: React.FC<Props> = ({
  dataCounts,
  title,
  loading,
  barColor = '#6366f1',
  limit = 8,
  filterType,
}) => {
  const { selectedRegion, selectedEducation, setSelectedEducation } = useAnalyticsFilter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (loading) {
    return <Skeleton className="h-72" />;
  }

  if (!dataCounts || Object.keys(dataCounts).length === 0) {
    return (
      <div className="h-72 rounded-2xl bg-surface border border-border flex items-center justify-center text-secondary text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const data = Object.entries(dataCounts)
    .filter(([name]) => name && name !== 'Не указано' && name !== 'null')
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({
      name: name.length > 22 ? name.slice(0, 20) + '…' : name,
      fullName: name,
      count,
    }));

  const axisTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="h-72 rounded-2xl bg-surface border border-border p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-xs font-bold text-primary tracking-wider uppercase">
            {title}
          </h4>
          {selectedRegion && (
            <span className="text-[10px] text-secondary">
              Регион: {selectedRegion}
            </span>
          )}
        </div>
        {filterType === 'education' && selectedEducation && (
          <button
            onClick={() => setSelectedEducation(null)}
            className="text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer"
            title="Сбросить фильтр по образованию"
          >
            {selectedEducation} ✕
          </button>
        )}
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis type="number" tick={{ fill: axisTextColor, fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: axisTextColor, fontSize: 10 }}
            />
            <Tooltip
              formatter={(val) =>
                val !== undefined && val !== null ? Number(val).toLocaleString('ru-RU') : '0'
              }
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullName || ''
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
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              onClick={(entry: any) => {
                if (filterType === 'education') {
                  const clicked = entry?.fullName || entry?.payload?.fullName;
                  if (clicked) {
                    setSelectedEducation(selectedEducation === clicked ? null : clicked);
                  }
                }
              }}
              className={filterType === 'education' ? 'cursor-pointer' : ''}
            >
              {data.map((entry) => {
                const isSelected = filterType === 'education' && selectedEducation === entry.fullName;
                const isFaded = filterType === 'education' && selectedEducation && !isSelected;
                return (
                  <Cell
                    key={entry.fullName}
                    fill={isSelected ? '#6366f1' : barColor}
                    opacity={isFaded ? 0.35 : 1}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
