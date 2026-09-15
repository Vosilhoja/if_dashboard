'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardCheck, Repeat2 } from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';
import { MetricCard } from './MetricCard';

interface SurveyAttemptsPanelProps {
  metrics: DashboardMetrics;
  attemptFilter: string;
  attemptRegion: string;
  attemptStatus: string;
  onAttemptFilterChange: (value: string) => void;
  onAttemptRegionChange: (value: string) => void;
  onAttemptStatusChange: (value: string) => void;
}

export function SurveyAttemptsPanel({
  metrics,
  attemptFilter,
  attemptRegion,
  attemptStatus,
  onAttemptFilterChange,
  onAttemptRegionChange,
  onAttemptStatusChange,
}: SurveyAttemptsPanelProps) {
  const details = metrics.surveyAttemptDetails;
  if (!details) return null;

  const regions = details.regions ?? [];
  const statuses = details.statuses ?? [];
  const chartData = regions.slice(0, 14).map((item) => ({
    name: item.region,
    people: item.people,
    attempts: item.attempts,
  }));

  return (
    <section className="space-y-3 rounded-[10px] border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-bold text-primary">Попытки прохождения опроса</h2>
        <p className="text-[11px] text-secondary">
          Учитываются все статусы, кроме created и пустых значений. Все фильтры синхронизированы.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard title="Пытались пройти" metric={metrics.surveyAttemptsPeople} icon={ClipboardCheck} badgeText="уникальные люди" delayIndex={0} />
        <MetricCard title="Всего попыток" metric={metrics.surveyAttemptsTotal} icon={Repeat2} badgeText="статусные ячейки" delayIndex={1} />
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={attemptFilter} onChange={(e) => onAttemptFilterChange(e.target.value)} className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-primary" aria-label="Количество попыток">
          <option value="all">Все люди</option>
          <option value="1">Ровно 1 попытка</option>
          <option value="2">Ровно 2 попытки</option>
          <option value="3">Ровно 3 попытки</option>
          <option value="4+">4 и более</option>
        </select>
        <select value={attemptRegion} onChange={(e) => onAttemptRegionChange(e.target.value)} className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-primary" aria-label="Регион попыток">
          <option value="all">Все регионы</option>
          {regions.map((item) => <option key={item.region} value={item.region.toLowerCase()}>{item.region}</option>)}
        </select>
        <select value={attemptStatus} onChange={(e) => onAttemptStatusChange(e.target.value)} className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-primary" aria-label="Статус попыток">
          <option value="all">Все статусы</option>
          {statuses.map((item) => <option key={item.status} value={item.status.toLowerCase()}>{item.status}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="h-64 rounded-md border border-border bg-surface-2 p-3">
          <div className="mb-2 text-[11px] font-semibold text-primary">Люди по регионам</div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={55} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="people" name="Люди" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
          {regions.map((item) => (
            <div key={item.region} className="rounded-md bg-surface-2 px-3 py-2">
              <div className="flex justify-between gap-2 text-xs">
                <span className="truncate text-primary">{item.region}</span>
                <strong className="text-accent">{item.people.toLocaleString('ru-RU')}</strong>
              </div>
              <div className="text-[10px] text-secondary">{item.attempts.toLocaleString('ru-RU')} попыток</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
