'use client';

import React from 'react';
import Link from 'next/link';
import { PhoneCall, Send, UserCheck, ArrowDown, ChevronRight, TrendingDown } from 'lucide-react';

interface FunnelStep {
  id: string;
  name: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface FunnelWidgetProps {
  callsCount: number;
  linksSentCount: number;
  registeredCount: number;
  loading?: boolean;
}

export const FunnelWidget: React.FC<FunnelWidgetProps> = ({
  callsCount,
  linksSentCount,
  registeredCount,
  loading = false,
}) => {
  const steps: FunnelStep[] = [
    {
      id: 'calls',
      name: '1. Звонки операторов',
      count: callsCount,
      icon: PhoneCall,
      color: '#3B82F6',
    },
    {
      id: 'links',
      name: '2. Ссылка отправлена',
      count: linksSentCount,
      icon: Send,
      color: '#8B5CF6',
    },
    {
      id: 'registered',
      name: '3. Зарегистрированы в базе',
      count: registeredCount,
      icon: UserCheck,
      color: '#10B981',
    },
  ];

  const maxVal = Math.max(callsCount, 1);

  return (
    <div className="bg-surface border border-border rounded-[10px] p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 shadow-xs hover-lift animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
        <div>
          <h3 className="text-xs font-bold text-primary">Воронка конверсии контактов</h3>
          <p className="text-[11px] text-secondary">
            Сквозной путь респондента от звонка до завершения регистрации
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:self-auto self-start bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-[6px]">
          <span className="text-[10px] font-semibold text-secondary">Итоговая конверсия:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs tabular-nums">
            {callsCount > 0 ? ((registeredCount / callsCount) * 100).toFixed(1) : '0.0'}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const nextStep = steps[idx + 1];
          const convToNext =
            nextStep && step.count > 0
              ? ((nextStep.count / step.count) * 100).toFixed(1)
              : null;
          const dropOff = convToNext ? (100 - Number(convToNext)).toFixed(1) : null;
          const widthPercent = Math.max(8, Math.min(100, (step.count / maxVal) * 100));

          return (
            <div
              key={step.id}
              className="relative p-3 rounded-[8px] bg-surface-2/60 border border-border/60 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="p-1.5 rounded-[6px] text-white"
                    style={{ backgroundColor: step.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-primary">{step.name}</span>
                </div>
              </div>

              <div>
                <div className="text-xl font-bold text-primary tabular-nums">
                  {step.count.toLocaleString('ru-RU')}
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden mt-1.5 border border-border/40">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: step.color,
                    }}
                  />
                </div>
              </div>

              {convToNext && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                  <span className="text-secondary">Конверсия в след. шаг:</span>
                  <div className="flex items-center gap-1 font-semibold text-primary tabular-nums">
                    <span>{convToNext}%</span>
                    <ChevronRight className="w-3 h-3 text-secondary" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
