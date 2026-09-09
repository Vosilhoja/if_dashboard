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
import { DATA_COLORS_LIST } from '@/lib/chart-colors';

interface Props {
  dataCounts: Record<string, number> | null;
  title: string;
  loading: boolean;
  limit?: number;
  filterType?: 'education' | 'profession' | 'source';
}

export const CategoryBarChart: React.FC<Props> = ({
  dataCounts,
  title,
  loading,
  limit = 7,
  filterType,
}) => {
  const {
    selectedRegion,
    selectedEducation,
    setSelectedEducation,
    selectedProfession,
    setSelectedProfession,
    selectedSource,
    setSelectedSource,
  } = useAnalyticsFilter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const currentSelected =
    filterType === 'education'
      ? selectedEducation
      : filterType === 'profession'
      ? selectedProfession
      : filterType === 'source'
      ? selectedSource
      : null;

  const handleToggle = (val: string) => {
    if (filterType === 'education') {
      setSelectedEducation(selectedEducation === val ? null : val);
    } else if (filterType === 'profession') {
      setSelectedProfession(selectedProfession === val ? null : val);
    } else if (filterType === 'source') {
      setSelectedSource(selectedSource === val ? null : val);
    }
  };

  const handleReset = () => {
    if (filterType === 'education') setSelectedEducation(null);
    else if (filterType === 'profession') setSelectedProfession(null);
    else if (filterType === 'source') setSelectedSource(null);
  };

  if (loading) {
    return <Skeleton className="h-64 rounded-[8px]" />;
  }

  if (!dataCounts || Object.keys(dataCounts).length === 0) {
    return (
      <div className="h-64 rounded-[8px] bg-surface border border-border flex items-center justify-center text-secondary text-xs">
        Нет данных для отображения
      </div>
    );
  }

  const data = Object.entries(dataCounts)
    .filter(([name]) => name && name !== 'Не указано' && name !== 'null')
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count], index) => ({
      name: name.length > 20 ? name.slice(0, 18) + '…' : name,
      fullName: name,
      count,
      color: DATA_COLORS_LIST[index % DATA_COLORS_LIST.length],
    }));

  const axisTextColor = isDark ? '#7C8494' : '#6B7280';

  return (
    <div className="h-64 rounded-[8px] bg-surface border border-border p-3.5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h4 className="text-xs font-semibold text-primary">
            {title}
          </h4>
          {selectedRegion && (
            <span className="text-[10px] text-secondary">
              Регион: {selectedRegion}
            </span>
          )}
        </div>
        {filterType && currentSelected && (
          <button
            onClick={handleReset}
            className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer"
            title="Сбросить фильтр"
          >
            {currentSelected} ✕
          </button>
        )}
      </div>

      <div className="flex-1 w-full min-h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 2, right: 15, left: 5, bottom: 2 }}>
            <XAxis type="number" tick={{ fill: axisTextColor, fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={105}
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
                backgroundColor: isDark ? '#12161F' : '#FFFFFF',
                borderColor: isDark ? '#1E2430' : '#E7E5E0',
                borderRadius: '6px',
                fontSize: '11px',
                color: isDark ? '#E4E7EC' : '#1C1E21',
                padding: '6px 10px',
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 2, 2, 0]}
              onClick={(entry: any) => {
                if (filterType) {
                  const clicked = entry?.fullName || entry?.payload?.fullName;
                  if (clicked) {
                    handleToggle(clicked);
                  }
                }
              }}
              className={filterType ? 'cursor-pointer' : ''}
            >
              {data.map((entry) => {
                const isSelected = Boolean(filterType && currentSelected === entry.fullName);
                const isFaded = Boolean(filterType && currentSelected && !isSelected);
                return (
                  <Cell
                    key={entry.fullName}
                    fill={entry.color}
                    opacity={isFaded ? 0.3 : 1}
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
