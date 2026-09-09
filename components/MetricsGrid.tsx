'use client';

import React from 'react';
import { PhoneCall, MessageSquareCheck, UserCheck, Headset, Repeat } from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';
import { MetricCard } from './MetricCard';

interface MetricsGridProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, loading }) => {
  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
      />
      <MetricCard
        title="5. После повторной ссылки"
        metric={metrics.registeredAfterRepeat}
        icon={Repeat}
        badgeText="повторно"
      />
    </div>
  );
};
