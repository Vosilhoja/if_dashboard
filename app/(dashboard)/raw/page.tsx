'use client';

import React from 'react';
import { RawDataTabs } from '@/components/RawDataTabs';
import { TableProperties } from 'lucide-react';

export default function RawDataPage() {
  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <TableProperties className="w-5 h-5 text-accent" />
          <h1 className="text-base font-semibold text-primary">
            Сырые данные Google Таблиц
          </h1>
        </div>
        <p className="text-xs text-secondary mt-0.5">
          Прямой постраничный просмотр 4 баз данных в реальном времени с мгновенным поиском по номеру и экспортом в CSV
        </p>
      </div>

      <RawDataTabs />
    </section>
  );
}
