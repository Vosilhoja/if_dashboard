'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
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
import { DATA_PALETTE } from '@/lib/chart-colors';

interface Props {
  ageBins: Record<AgeBin, { Мужской: number; Женский: number }> | null;
  averageAge: number | null;
  loading: boolean;
}

export const AgePyramidChart: React.FC<Props> = ({ ageBins, averageAge, loading }) => {
  const { selectedRegion, selectedAgeBin, setSelectedAgeBin } = useAnalyticsFilter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (loading) {
    return <Skeleton className="h-64 rounded-[8px]" />;
  }

  if (!ageBins) {
    return (
      <div className="h-64 rounded-[8px] bg-surface border border-border flex items-center justify-center text-secondary text-xs">
        Нет данных для отображения
      </div>
    );
  }

  const data = Object.entries(ageBins).map(([bin, counts]) => ({
    bin: bin as AgeBin,
    Мужской: counts.Мужской,
    Женский: counts.Женский,
    Всего: counts.Мужской + counts.Женский,
  }));

  const axisTextColor = isDark ? '#7C8494' : '#6B7280';

  const handleBinClick = (bin: AgeBin) => {
    setSelectedAgeBin(selectedAgeBin === bin ? null : bin);
  };

  return (
    <div className="h-64 rounded-[8px] bg-surface border border-border p-3.5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h4 className="text-xs font-semibold text-primary">
            Возрастные группы и пол
          </h4>
          {selectedRegion && (
            <span className="text-[10px] text-secondary">
              Регион: {selectedRegion}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {selectedAgeBin && (
            <button
              onClick={() => setSelectedAgeBin(null)}
              className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer"
              title="Сбросить фильтр по возрасту"
            >
              {selectedAgeBin} ✕
            </button>
          )}
          {averageAge && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border tabular-nums">
              Ср. возраст: <strong className="text-primary">{averageAge}</strong> лет
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis dataKey="bin" tick={{ fill: axisTextColor, fontSize: 10 }} />
            <YAxis tick={{ fill: axisTextColor, fontSize: 10 }} />
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
              formatter={(value) => <span className="text-xs text-secondary">{value}</span>}
            />
            <Bar
              dataKey="Мужской"
              radius={[2, 2, 0, 0]}
              className="cursor-pointer"
              onClick={(entry: any) => {
                const bin = entry?.bin || entry?.payload?.bin;
                if (bin) handleBinClick(bin);
              }}
            >
              {data.map((entry) => {
                const isSelected = selectedAgeBin === entry.bin;
                const isFaded = Boolean(selectedAgeBin && !isSelected);
                return (
                  <Cell
                    key={`male-${entry.bin}`}
                    fill={DATA_PALETTE.data1}
                    opacity={isFaded ? 0.25 : 1}
                  />
                );
              })}
            </Bar>
            <Bar
              dataKey="Женский"
              radius={[2, 2, 0, 0]}
              className="cursor-pointer"
              onClick={(entry: any) => {
                const bin = entry?.bin || entry?.payload?.bin;
                if (bin) handleBinClick(bin);
              }}
            >
              {data.map((entry) => {
                const isSelected = selectedAgeBin === entry.bin;
                const isFaded = Boolean(selectedAgeBin && !isSelected);
                return (
                  <Cell
                    key={`female-${entry.bin}`}
                    fill={DATA_PALETTE.data2}
                    opacity={isFaded ? 0.25 : 1}
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
