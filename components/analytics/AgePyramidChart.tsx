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

interface Props {
  ageBins: Record<AgeBin, { Мужской: number; Женский: number }> | null;
  averageAge: number | null;
  loading: boolean;
}

export const AgePyramidChart: React.FC<Props> = ({ ageBins, averageAge, loading }) => {
  if (loading) {
    return <div className="h-72 rounded-2xl bg-slate-900/60 animate-pulse" />;
  }

  if (!ageBins) {
    return (
      <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const data = Object.entries(ageBins).map(([bin, counts]) => ({
    bin,
    Мужской: counts.Мужской,
    Женский: counts.Женский,
  }));

  return (
    <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-white tracking-wider uppercase">
          Возрастные группы и пол
        </h4>
        {averageAge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Ср. возраст: {averageAge} лет
          </span>
        )}
      </div>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="bin" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              formatter={(val) =>
                val !== undefined && val !== null ? Number(val).toLocaleString('ru-RU') : '0'
              }
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#fff',
              }}
            />
            <Legend verticalAlign="bottom" height={36} />
            <Bar dataKey="Мужской" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Женский" fill="#f472b6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
