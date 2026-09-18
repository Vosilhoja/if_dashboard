'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DataTable } from './DataTable';

export const RawDataTabs: React.FC = () => {
  // Раздел "Таблицы" — независимый просмотр всех данных.
  // НЕ наследует период с дашборда "Операционная воронка": иначе таблица
  // молча показывает 200-300 строк вместо всех ~33 тыс, и это выглядит
  // как потеря данных, хотя данные просто отфильтрованы по чужому периоду.
  const pathname = usePathname();
  const pathTab = pathname.split('/').filter(Boolean).at(-1);
  const slugToType = { 'main-base': 'main', numbers: 'numbers', eskiz: 'eskiz', not_completed: 'not_completed', survey_attempts: 'survey_attempts' } as const;
  const activeTab = slugToType[pathTab as keyof typeof slugToType] || 'numbers';

  const tables = [
    {
      id: 'numbers' as const,
      label: 'Номера поддержки (numbers)',
      description: 'Журнал обзвонов, статусы, комментарии и время разговоров',
    },
    {
      id: 'main' as const,
      label: 'Основная база (main_base)',
      description: 'Все зарегистрированные респонденты платформы HURMO UZ',
    },
    {
      id: 'eskiz' as const,
      label: 'SMS-шлюз (eskiz)',
      description: 'Отправленные сообщения, статусы доставки и списания',
    },
    {
      id: 'not_completed' as const,
      label: 'Не завершили регистрацию (not_completed)',
      description: 'Пользователи, начавшие регистрацию, но не завершившие её',
    },
    {
      id: 'survey_attempts' as const,
      label: 'Попытки опроса (survey_attempts)',
      description: 'История попыток прохождения опроса по неделям и статусам',
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        key={activeTab}
        sheetType={activeTab}
        title={tables.find((table) => table.id === activeTab)?.label || ''}
        startDate=""
        endDate=""
      />
    </div>
  );
};
