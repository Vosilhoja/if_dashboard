'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  genderCount: { Мужской: number; Женский: number } | null;
  loading: boolean;
}

const COLORS = { Мужской: '#60a5fa', Женский: '#f472b6' };

export const GenderPieChart: React.FC<Props> = ({ genderCount, loading }) => {
  if (loading) {
    return <div className="h-72 rounded-2xl bg-slate-900/60 animate-pulse" />;
  }
  if (!genderCount || (genderCount.Мужской === 0 && genderCount.Женский === 0)) {
    return (
      <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const data = [
    { name: 'Мужской', value: genderCount.Мужской },
    { name: 'Женский', value: genderCount.Женский },
  ];

  return (
    <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col">
      <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-2">
        Распределение по полу (main_base)
      </h4>
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
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
