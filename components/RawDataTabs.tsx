'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Phone, MessageSquare, ClipboardCheck } from 'lucide-react';
import { DataTable } from './DataTable';

export const RawDataTabs: React.FC = () => {
  // Раздел "Таблицы" — независимый просмотр всех данных.
  // НЕ наследует период с дашборда "Операционная воронка": иначе таблица
  // молча показывает 200-300 строк вместо всех ~33 тыс, и это выглядит
  // как потеря данных, хотя данные просто отфильтрованы по чужому периоду.
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
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => router.push(`/raw/${tab.id === 'main' ? 'main-base' : tab.id}`)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-transparent text-secondary hover:border-border hover:text-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <DataTable
        key={activeTab}
        sheetType={activeTab}
        title={tabs.find((t) => t.id === activeTab)?.label || ''}
        startDate=""
        endDate=""
      />
    </div>
  );
};
