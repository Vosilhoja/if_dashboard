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

  const tableLabels: Record<typeof activeTab, string> = {
    numbers: 'Номера поддержки (numbers)',
    main: 'Основная база (main_base)',
    eskiz: 'SMS-шлюз (eskiz)',
    not_completed: 'Не завершили регистрацию (not_completed)',
    survey_attempts: 'Попытки опроса (survey_attempts)',
  };

  return (
    <div className="space-y-4">
      <DataTable
        key={activeTab}
        sheetType={activeTab}
        title={tableLabels[activeTab]}
        startDate=""
        endDate=""
      />
    </div>
  );
};
