import { notFound } from 'next/navigation';
import { RawDataTabs } from '@/components/RawDataTabs';
import { TableProperties } from 'lucide-react';

const sheetTypes = ['main-base', 'numbers', 'eskiz', 'not_completed', 'survey_attempts'] as const;

export default async function RawSheetPage({ params }: { params: Promise<{ sheet: string }> }) {
  const { sheet } = await params;
  if (!sheetTypes.includes(sheet as (typeof sheetTypes)[number])) notFound();

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <TableProperties className="w-5 h-5 text-accent" />
          <h1 className="text-base font-semibold text-primary">Сырые данные Google Таблиц</h1>
        </div>
        <p className="text-xs text-secondary mt-0.5">
          Прямой постраничный просмотр 5 подключённых Google Таблиц с поиском и экспортом в CSV
        </p>
      </div>
      <RawDataTabs />
    </section>
  );
}
