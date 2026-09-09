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
import { Skeleton } from './ui/Skeleton';

interface MetricsGridProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-28 rounded-[8px]" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-3">
      {/* 8 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        {metrics.notCompletedCount && (
          <MetricCard
            title="9. Не завершили регистрацию"
            metric={metrics.notCompletedCount}
            badgeText="not_completed"
            tooltipText="Пользователи, начавшие регистрацию в период, но не завершившие её (Not completed)"
          />
        )}
      </div>

      {/* Diagnostics summary strip */}
      {metrics.phoneDiagnostics && (
        <div className="bg-surface border border-border rounded-[8px] p-2.5 px-3 flex flex-wrap items-center justify-between gap-2.5 text-xs text-secondary">
          <span className="font-medium text-primary">
            Качество номеров:
          </span>
          <div className="flex flex-wrap items-center gap-3.5">
            <span>
              Научная нотация: <strong className="text-amber-500 font-medium tabular-nums">{metrics.phoneDiagnostics.corrupted}</strong>
            </span>
            <span>
              Обрезаны: <strong className="text-rose-500 font-medium tabular-nums">{metrics.phoneDiagnostics.truncated}</strong>
            </span>
            <span>
              Мусор / &le;8: <strong className="text-primary font-medium tabular-nums">{metrics.phoneDiagnostics.invalid}</strong>
            </span>
            <span>
              Иностранные: <strong className="text-accent font-medium tabular-nums">{metrics.phoneDiagnostics.foreign}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
