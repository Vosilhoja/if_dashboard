'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  PhoneCall,
  UserX,
  Search,
  Download,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { formatPhoneDisplay, normalizePhoneWithDiagnostics } from '@/lib/phone-utils';
import { exportRowsToCSV } from '@/lib/csv-utils';

interface Props {
  startDate: string;
  endDate: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PeriodData {
  startDate: string;
  endDate: string;
  totalCalls: number;
  totalNotCompleted: number;
  calls: Record<string, string>[];
  notCompleted: Record<string, string>[];
  cachedAt?: string;
}

export const PeriodDetailsPanel: React.FC<Props> = ({
  startDate,
  endDate,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'calls' | 'notCompleted'>('calls');
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setPage(1);

    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    fetch(`/api/proxy/data/period?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: PeriodData) => {
        setData(json);
      })
      .catch((err) => {
        setError(err.message || 'Ошибка загрузки деталей периода');
      })
      .finally(() => setLoading(false));
  }, [isOpen, startDate, endDate]);

  // Current list based on active tab
  const rawList = useMemo(() => {
    if (!data) return [];
    return activeTab === 'calls' ? data.calls : data.notCompleted;
  }, [data, activeTab]);

  // Filter list by search
  const filteredList = useMemo(() => {
    if (!search.trim()) return rawList;
    const q = search.toLowerCase().trim();
    return rawList.filter((row) =>
      Object.values(row).some((val) => String(val || '').toLowerCase().includes(q))
    );
  }, [rawList, search]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  // CSV download for current tab's slice
  const downloadCSV = () => {
    if (!filteredList.length) return;
    const sample = filteredList[0];
    const headers = Object.keys(sample);
    const filename = `${activeTab}_${startDate || 'all'}_${endDate || 'all'}.csv`;
    exportRowsToCSV(filteredList, headers, filename);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end items-end sm:items-stretch">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer: full width & height on mobile / bottom sheet, sidebar on desktop */}
      <div className="relative w-full sm:max-w-2xl bg-surface border-t sm:border-t-0 sm:border-l border-border shadow-2xl h-[90vh] sm:h-full rounded-t-[16px] sm:rounded-t-none flex flex-col z-10 animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-primary">
                Детали за период
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              <p className="text-[11px] text-secondary tabular-nums">
                Период:{' '}
                <strong className="text-primary">
                  {startDate || 'Начало'} — {endDate || 'Конец'}
                </strong>
              </p>
              {data?.cachedAt && (
                <div className="flex items-center gap-1 text-[10px] text-secondary tabular-nums">
                  <Clock className="w-3 h-3 text-secondary/70" />
                  <span>
                    Данные по состоянию на:{' '}
                    <strong className="text-primary font-medium">
                      {new Date(data.cachedAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-secondary hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-border px-4 bg-surface-2/40">
          <button
            onClick={() => {
              setActiveTab('calls');
              setPage(1);
              setSearch('');
            }}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'calls'
                ? 'border-accent text-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-accent" />
            <span>Кому звонили</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border tabular-nums">
              {data?.totalCalls.toLocaleString() ?? '...'}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('notCompleted');
              setPage(1);
              setSearch('');
            }}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'notCompleted'
                ? 'border-accent text-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <UserX className="w-3.5 h-3.5 text-rose-500" />
            <span>Не завершили регистрацию</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border tabular-nums">
              {data?.totalNotCompleted.toLocaleString() ?? '...'}
            </span>
          </button>
        </div>

        {/* Controls: Search & Download */}
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Поиск по телефону, имени, статусу..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary placeholder-secondary focus:outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={downloadCSV}
            disabled={!filteredList.length}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 disabled:opacity-40 text-secondary hover:text-primary border border-border text-xs transition-colors cursor-pointer shrink-0"
            title="Скачать текущий список в CSV"
          >
            <Download className="w-3.5 h-3.5 text-secondary" />
            <span className="text-[11px]">CSV</span>
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="m-3 p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-secondary text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span>Загрузка данных за период...</span>
            </div>
          ) : pagedRows.length > 0 ? (
            pagedRows.map((row, idx) => {
              const rawPhone =
                row['Телефон'] || row['Phone'] || row['Номер телефона'] || '';
              const phoneDiag = rawPhone
                ? normalizePhoneWithDiagnostics(rawPhone)
                : null;
              const dateStr =
                row['Дата (формат xx.xx.xxxx)'] ||
                row['Дата создания'] ||
                row['Дата'] ||
                row['Start date'] ||
                row['date'] ||
                '';
              const status =
                row['Статус'] || row['status'] || row['Status'] || '';
              const comment =
                row['Коментарий'] ||
                row['Комментарий'] ||
                row['comment'] ||
                row['Причина'] ||
                '';
              const name = row['Имя'] || row['Name'] || row['ФИО'] || '';

              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-[6px] bg-surface-2/60 border border-border/80 hover:border-accent/40 transition-colors text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {rawPhone ? (
                        <span className="font-mono text-primary font-medium bg-surface px-1.5 py-0.5 rounded-[4px] border border-border tabular-nums text-[11px]">
                          {formatPhoneDisplay(
                            phoneDiag?.normalized || rawPhone,
                            phoneDiag?.country
                          )}
                        </span>
                      ) : (
                        <span className="text-secondary text-[11px]">Нет номера</span>
                      )}

                      {phoneDiag &&
                        phoneDiag.country !== 'UZ' &&
                        phoneDiag.country !== 'UNKNOWN' && (
                          <span className="text-[10px] px-1 py-0.5 rounded-[4px] bg-surface border border-border text-secondary font-medium">
                            {phoneDiag.country}
                          </span>
                        )}

                      {name && (
                        <span className="text-primary font-medium">{name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      {status && (
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-accent/10 text-accent font-medium border border-accent/20">
                          {status}
                        </span>
                      )}
                      {dateStr && (
                        <span className="text-secondary tabular-nums">
                          {dateStr}
                        </span>
                      )}
                    </div>
                  </div>

                  {comment && (
                    <div className="text-[11px] text-secondary bg-surface/50 p-1.5 rounded-[4px] border border-border/50">
                      {comment}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-secondary text-xs">
              <span>Записей за указанный период не найдено</span>
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        {filteredList.length > pageSize && (
          <div className="p-3 border-t border-border flex items-center justify-between bg-surface text-xs text-secondary">
            <span className="text-[11px]">
              Показано {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filteredList.length)} из{' '}
              {filteredList.length.toLocaleString()}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 disabled:opacity-40 text-primary border border-border transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-0.5 rounded-[4px] bg-surface-2 border border-border text-[11px] text-primary tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 disabled:opacity-40 text-primary border border-border transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
