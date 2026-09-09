'use client';

import React, { useState } from 'react';
import { Users, Phone, MessageSquare } from 'lucide-react';
import { DataTable } from './DataTable';

export const RawDataTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'main' | 'numbers' | 'eskiz' | 'not_completed'>('numbers');

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
  ];

  return (
    <div className="space-y-3">
      {/* Tab headers */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] font-medium text-xs transition-colors cursor-pointer border ${
                isActive
                  ? 'bg-surface text-primary border-border shadow-xs'
                  : 'bg-transparent text-secondary hover:text-primary border-transparent hover:bg-surface-2'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-secondary" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <DataTable
        key={activeTab}
        sheetType={activeTab}
        title={tabs.find((t) => t.id === activeTab)?.label || ''}
      />
    </div>
  );
};
