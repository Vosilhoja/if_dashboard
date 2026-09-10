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
    <div className="space-y-4">
      {/* Tab headers — Horizontal Scrollable Pills on Mobile */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-border/60 -mx-3 px-3 sm:mx-0 sm:px-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`active-press flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-surface-2/70 text-secondary hover:text-primary border-border/60 hover:bg-surface-2'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-secondary'}`} />
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
