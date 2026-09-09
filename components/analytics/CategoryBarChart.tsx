'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  dataCounts: Record<string, number> | null;
  title: string;
  loading: boolean;
  barColor?: string;
  limit?: number;
}

export const CategoryBarChart: React.FC<Props> = ({
  dataCounts,
  title,
  loading,
  barColor = '#818cf8',
  limit = 8,
}) => {
  if (loading) {
    return <div className="h-72 rounded-2xl bg-slate-900/60 animate-pulse" />;
  }

  if (!dataCounts || Object.keys(dataCounts).length === 0) {
    return (
      <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
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

  return (
    <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col">
      <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-2">
        {title}
      </h4>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <Tooltip
              formatter={(val) =>
                val !== undefined && val !== null ? Number(val).toLocaleString('ru-RU') : '0'
              }
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullName || ''
              }
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#fff',
              }}
            />
            <Bar dataKey="count" fill={barColor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
