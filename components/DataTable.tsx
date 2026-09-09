'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  AlertCircle,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SheetPaginatedResponse } from '@/lib/types';
import { formatPhoneDisplay, normalizePhoneWithDiagnostics } from '@/lib/phone-utils';
import { Skeleton } from './ui/Skeleton';

interface DataTableProps {
  sheetType: 'main' | 'numbers' | 'eskiz';
  title: string;
}

export const DataTable: React.FC<DataTableProps> = ({ sheetType, title }) => {
  const [data, setData] = useState<SheetPaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showAllColumnsMobile, setShowAllColumnsMobile] = useState(false);
  const [, startTransition] = useTransition();

  const fetchData = async (p = page, search = activeSearch, size = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(size),
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/sheets/${sheetType}?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json: SheetPaginatedResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, activeSearch, pageSize);
  }, [sheetType, page, activeSearch, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    startTransition(() => {
      setActiveSearch(searchInput.trim());
    });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setPage(1);
  };

  // Identify column types
  const isPhoneColumn = (header: string) => {
    const h = header.toLowerCase();
    return h.includes('phone') || h.includes('телефон') || h.includes('номер');
  };

  const isStatusColumn = (header: string) => {
    const h = header.toLowerCase();
    return h.includes('статус') || h.includes('status');
  };

  // Determine priority mobile columns
  const isPriorityMobileColumn = (header: string) => {
    const h = header.toLowerCase();
    return (
      isPhoneColumn(header) ||
      h.includes('дата') ||
      h.includes('date') ||
      isStatusColumn(header) ||
      h.includes('коментарий') ||
      h.includes('имя')
    );
  };

  const downloadCSV = () => {
    if (!data || data.rows.length === 0) return;
    const headers = data.headers;
    const escapeCsv = (val: string) => {
      const v = String(val ?? '').replace(/"/g, '""');
      return `"${v}"`;
    };

    const csvLines: string[] = [];
    csvLines.push(headers.map(escapeCsv).join(','));

    data.rows.forEach((row) => {
      const line = headers.map((h) => escapeCsv(row[h] || '')).join(',');
      csvLines.push(line);
    });

    const csvContent = '\uFEFF' + csvLines.join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${sheetType}_data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* Controls Bar */}
      <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            <h3 className="text-xs sm:text-sm font-bold text-primary tracking-wide">{title}</h3>
            {data && (
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-surface-2 text-secondary border border-border">
                {data.total.toLocaleString()} строк
              </span>
            )}
          </div>

          {/* Mobile column toggle button */}
          <button
            onClick={() => setShowAllColumnsMobile(!showAllColumnsMobile)}
            className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-2 text-[11px] text-secondary border border-border"
          >
            {showAllColumnsMobile ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showAllColumnsMobile ? 'Кратко' : 'Все колонки'}</span>
          </button>
        </div>

        {/* Search, Download CSV & Page Size */}
        <div className="flex items-center flex-wrap gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Поиск по номеру или тексту..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-16 py-2 min-h-[44px] bg-surface-2 border border-border focus:border-accent rounded-xl text-xs text-primary placeholder-secondary focus:outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-secondary hover:text-primary px-2 py-1 rounded bg-surface border border-border cursor-pointer"
              >
                Сброс
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={downloadCSV}
            disabled={!data || data.rows.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-surface-2 hover:bg-surface-2/80 disabled:opacity-40 text-secondary hover:text-primary border border-border text-xs font-medium transition-colors cursor-pointer"
            title="Скачать текущие строки как CSV"
          >
            <Download className="w-4 h-4 text-accent" />
            <span className="hidden sm:inline">Скачать CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-surface-2 border border-border rounded-xl px-2.5 py-2 min-h-[44px] text-xs text-primary focus:outline-none cursor-pointer"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="m-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-semibold">Ошибка загрузки таблицы</div>
            <div className="mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto relative min-h-[350px] max-h-[550px] scrollbar-thin">
        {loading && !data ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.rows.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-surface text-secondary font-semibold border-b border-border z-10">
              <tr>
                <th className="py-3 px-3 w-12 text-center text-secondary sticky left-0 bg-surface z-20 shadow-[1px_0_0_var(--border-color)]">
                  #
                </th>
                {data.headers.map((header) => {
                  const isPriority = isPriorityMobileColumn(header);
                  return (
                    <th
                      key={header}
                      className={`py-3 px-3 whitespace-nowrap tracking-wider uppercase text-[11px] ${
                        !isPriority && !showAllColumnsMobile ? 'hidden sm:table-cell' : ''
                      }`}
                    >
                      {header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.rows.map((row, idx) => {
                const rowIndex = (data.page - 1) * data.pageSize + idx + 1;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-surface-2/60 transition-colors odd:bg-surface-2/20"
                  >
                    <td className="py-2.5 px-3 text-center text-secondary font-mono text-[10px] sticky left-0 bg-surface z-10 shadow-[1px_0_0_var(--border-color)]">
                      {rowIndex}
                    </td>
                    {data.headers.map((header) => {
                      const cellVal = row[header] || '';
                      const isPhone = isPhoneColumn(header);
                      const isStatus = isStatusColumn(header);
                      const isPriority = isPriorityMobileColumn(header);

                      let phoneDiag = null;
                      if (isPhone && cellVal) {
                        phoneDiag = normalizePhoneWithDiagnostics(cellVal);
                      }

                      return (
                        <td
                          key={header}
                          className={`py-2.5 px-3 whitespace-nowrap text-primary max-w-xs truncate ${
                            !isPriority && !showAllColumnsMobile ? 'hidden sm:table-cell' : ''
                          }`}
                          title={cellVal}
                        >
                          {isPhone && cellVal ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                                {formatPhoneDisplay(phoneDiag?.normalized || cellVal, phoneDiag?.country)}
                              </span>
                              {phoneDiag && phoneDiag.country !== 'UZ' && phoneDiag.country !== 'UNKNOWN' && (
                                <span className="text-[10px] px-1 py-0.5 rounded bg-surface-2 border border-border text-secondary font-semibold">
                                  {phoneDiag.country}
                                </span>
                              )}
                            </div>
                          ) : isStatus && cellVal ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {cellVal}
                            </span>
                          ) : (
                            cellVal || <span className="text-secondary/50">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center h-64 text-secondary text-xs">
              <Database className="w-8 h-8 mb-2 opacity-40" />
              <span>Данных не найдено</span>
              {activeSearch && (
                <span className="mt-1 text-primary">по запросу &quot;{activeSearch}&quot;</span>
              )}
            </div>
          )
        )}
      </div>

      {/* Pagination Footer */}
      {data && data.totalPages > 1 && (
        <div className="p-3 sm:p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface text-xs text-secondary">
          <div>
            Страница <strong className="text-primary">{data.page}</strong> из{' '}
            <strong className="text-primary">{data.totalPages}</strong> ({data.total.toLocaleString()} строк)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-surface-2 hover:bg-surface-2/80 disabled:opacity-40 text-primary border border-border transition-colors cursor-pointer"
              title="Предыдущая страница"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-mono text-primary bg-surface-2 border border-border rounded-lg">
              {page}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages || loading}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-surface-2 hover:bg-surface-2/80 disabled:opacity-40 text-primary border border-border transition-colors cursor-pointer"
              title="Следующая страница"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
