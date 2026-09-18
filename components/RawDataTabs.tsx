'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Phone, MessageSquare, ClipboardCheck } from 'lucide-react';
import { DataTable } from './DataTable';
import { Dropdown } from './ui/Dropdown';

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
      <div className="max-w-xl">
        <Dropdown
          value={activeTab}
          onChange={(value) => router.push(`/raw/${value === 'main' ? 'main-base' : value}`)}
          ariaLabel="Выбор таблицы"
          options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
        />
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
