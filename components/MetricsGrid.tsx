'use client';

import React from 'react';
import {
  PhoneCall,
  MessageSquareCheck,
  UserCheck,
  Headset,
  Repeat,
  UserX,
  Bot,
  UsersRound,
} from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';
import { MetricCard } from './MetricCard';

interface MetricsGridProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="h-40 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse p-5 flex flex-col justify-between"
          >
            <div className="h-4 w-28 bg-slate-800 rounded" />
            <div className="h-8 w-20 bg-slate-800 rounded" />
            <div className="h-3 w-36 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      {/* 8 Metric Cards: 5 core + 3 new high-volume funnel categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard
          title="1. Звонков операторов"
          metric={metrics.callsCount}
          icon={PhoneCall}
          badgeText="numbers"
        />
        <MetricCard
          title="2. SMS (сверка)"
          metric={metrics.smsSentVerification}
          icon={MessageSquareCheck}
          badgeText="numbers / eskiz"
          tooltipText="X ссылок отправлено по данным numbers / Y SMS реально отправлено по Eskiz (DELIVERED+ACCEPTED)"
        />
        <MetricCard
          title="3. Регистраций в панели"
          metric={metrics.registeredMainBase}
          icon={UserCheck}
          badgeText="main_base"
        />
        <MetricCard
          title="4. От поддержки"
          metric={metrics.registeredFromSupport}
          icon={Headset}
          badgeText="numbers → base"
          tooltipText="Уникальные абоненты из таблицы numbers, найденные среди зарегистрированных в main_base"
        />
        <MetricCard
          title="5. После повторной ссылки"
          metric={metrics.registeredAfterRepeat}
          icon={Repeat}
          badgeText="повторно"
        />
        <MetricCard
          title="6. Отказы респондентов"
          metric={metrics.declinedCount}
          icon={UserX}
          badgeText="otkaz / vaqti yo'q"
          tooltipText="Отказы, отсутствие времени, сбросы звонков оператора (более 13k в общей базе)"
        />
        <MetricCard
          title="7. Уже через бот"
          metric={metrics.alreadyRegisteredCount}
          icon={Bot}
          badgeText="bot bor"
          tooltipText="Абоненты, которые сообщили, что уже зарегистрировались или пользуются Telegram-ботом"
        />
        <MetricCard
          title="8. Не тот человек / номер"
          metric={metrics.wrongPersonCount}
          icon={UsersRound}
          badgeText="boshqa odam"
          tooltipText="Зарегистрированы с другого номера, чужой номер, второй номер"
        />
      </div>

      {/* Diagnostics summary strip if any anomalous numbers detected */}
      {metrics.phoneDiagnostics && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">
            Качество телефонных номеров:
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Научная нотация Excel: <strong className="text-amber-400">{metrics.phoneDiagnostics.corrupted}</strong>
            </span>
            <span>
              Неполные / обрезаны: <strong className="text-rose-400">{metrics.phoneDiagnostics.truncated}</strong>
            </span>
            <span>
              Мусор / &le;8 цифр: <strong className="text-slate-300">{metrics.phoneDiagnostics.invalid}</strong>
            </span>
            <span>
              Иностранные (РФ/Укр): <strong className="text-indigo-400">{metrics.phoneDiagnostics.foreign}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
