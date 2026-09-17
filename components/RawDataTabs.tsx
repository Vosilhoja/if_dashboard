'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Phone, MessageSquare, ClipboardCheck } from 'lucide-react';
import { DataTable } from './DataTable';
import { Button } from './ui/Button';
import { Dropdown } from './ui/Dropdown';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';

export const RawDataTabs: React.FC = () => {
  const { startDate, endDate, filterMode } = useAnalyticsFilter();
  const pathname = usePathname();
  const router = useRouter();
  const pathTab = pathname.split('/').filter(Boolean).at(-1);
  const slugToType = { 'main-base': 'main', numbers: 'numbers', eskiz: 'eskiz', not_completed: 'not_completed', survey_attempts: 'survey_attempts' } as const;
  const activeTab = slugToType[pathTab as keyof typeof slugToType] || 'numbers';

  const tabs = [
    {
      id: 'numbers' as const,
      label: 'Номера поддержки (numbers)',
      icon: Phone,
      description: 'Журнал обзвонов, статусы, комментарии и время разговоров',
    },
    {
      id: 'main' as const,
      label: 'Основная база (main_base)',
      icon: Users,
      description: 'Все зарегистрированные респонденты платформы HURMO UZ',
    },
    {
      id: 'eskiz' as const,
      label: 'SMS-шлюз (eskiz)',
      icon: MessageSquare,
      description: 'Отправленные сообщения, статусы доставки и списания',
    },
    {
      id: 'not_completed' as const,
      label: 'Не завершили регистрацию (not_completed)',
      icon: Users,
      description: 'Пользователи, начавшие регистрацию, но не завершившие её',
    },
    {
      id: 'survey_attempts' as const,
      label: 'Попытки опроса (survey_attempts)',
      icon: ClipboardCheck,
      description: 'История попыток прохождения опроса по неделям и статусам',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="sm:hidden">
        <Dropdown
          value={activeTab}
          onChange={(value) => router.push(`/raw/${value === 'main' ? 'main-base' : value}`)}
          ariaLabel="Выбор таблицы"
          options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
        />
      </div>

      {/* Tab headers — compact dropdown on mobile, pills on desktop */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-border/60">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <Button
              key={t.id}
              onClick={() => router.push(`/raw/${t.id === 'main' ? 'main-base' : t.id}`)}
              className={`active-press rounded-xl whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-surface-2/70 text-secondary hover:text-primary border-border/60 hover:bg-surface-2'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-secondary'}`} />
              <span>{t.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <DataTable
        key={activeTab}
        sheetType={activeTab}
        title={tabs.find((t) => t.id === activeTab)?.label || ''}
        startDate={filterMode === 'alltime' ? '' : startDate}
        endDate={filterMode === 'alltime' ? '' : endDate}
      />
    </div>
  );
};
