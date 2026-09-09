'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  sheetType: 'main' | 'numbers' | 'eskiz' | 'not_completed';
  title: string;
}

export const DataTable: React.FC<DataTableProps> = ({ sheetType, title }) => {
  const [data, setData] = useState<SheetPaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageInput, setPageInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showAllColumnsMobile, setShowAllColumnsMobile] = useState(false);
  const [, startTransition] = useTransition();

  const goToPage = () => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && data && n <= data.totalPages) {
      setPage(n);
    }
    setPageInput('');
  };

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
    <div className="bg-surface border border-border rounded-[8px] overflow-hidden flex flex-col">
      {/* Controls Bar */}
      <div className="p-3 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-secondary" />
            <h3 className="text-xs font-semibold text-primary">{title}</h3>
            {data && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border tabular-nums">
                {data.total.toLocaleString()} строк
              </span>
            )}
          </div>

          {/* Mobile column toggle button */}
          <button
            onClick={() => setShowAllColumnsMobile(!showAllColumnsMobile)}
            className="sm:hidden flex items-center gap-1 px-2 py-1 rounded-[4px] bg-surface-2 text-[10px] text-secondary border border-border"
          >
            {showAllColumnsMobile ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showAllColumnsMobile ? 'Кратко' : 'Все'}</span>
          </button>
        </div>

        {/* Search, Download CSV & Page Size */}
        <div className="flex items-center flex-wrap gap-1.5">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Поиск по номеру..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-12 py-1.5 bg-surface-2 border border-border focus:border-accent rounded-[6px] text-xs text-primary placeholder-secondary focus:outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-secondary hover:text-primary px-1.5 py-0.5 rounded bg-surface border border-border cursor-pointer"
              >
                Сброс
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={downloadCSV}
            disabled={!data || data.rows.length === 0}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 disabled:opacity-40 text-secondary hover:text-primary border border-border text-xs font-medium transition-colors cursor-pointer"
            title="Скачать строки как CSV"
          >
            <Download className="w-3.5 h-3.5 text-secondary" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-surface-2 border border-border rounded-[6px] px-2 py-1.5 text-xs text-primary focus:outline-none cursor-pointer tabular-nums"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="m-3 p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto relative min-h-[320px] max-h-[500px]">
        {loading && !data ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-[4px]" />
            ))}
          </div>
        ) : data && data.rows.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-surface-2 text-secondary font-medium border-b border-border z-10 text-[11px]">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center text-secondary sticky left-0 bg-surface-2 z-20 shadow-[1px_0_0_var(--border-color)]">
                  #
                </th>
                {data.headers.map((header) => {
                  const isPriority = isPriorityMobileColumn(header);
                  return (
                    <th
                      key={header}
                      className={`py-2 px-2.5 whitespace-nowrap font-medium ${
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
                    <td className="py-1.5 px-2.5 text-center text-secondary font-mono text-[10px] sticky left-0 bg-surface z-10 shadow-[1px_0_0_var(--border-color)] tabular-nums">
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
                          className={`py-1.5 px-2.5 whitespace-nowrap text-primary max-w-xs truncate ${
                            !isPriority && !showAllColumnsMobile ? 'hidden sm:table-cell' : ''
                          }`}
                          title={cellVal}
                        >
                          {isPhone && cellVal ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono text-primary bg-surface-2 px-1.5 py-0.5 rounded-[4px] border border-border tabular-nums text-[11px]">
                                {formatPhoneDisplay(phoneDiag?.normalized || cellVal, phoneDiag?.country)}
                              </span>
                              {phoneDiag && phoneDiag.country !== 'UZ' && phoneDiag.country !== 'UNKNOWN' && (
                                <span className="text-[10px] px-1 py-0.5 rounded-[4px] bg-surface-2 border border-border text-secondary font-medium">
                                  {phoneDiag.country}
                                </span>
                              )}
                            </div>
                          ) : isStatus && cellVal ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-[4px] border border-emerald-500/20 text-[11px]">
                              {cellVal}
                            </span>
                          ) : (
                            <span className="tabular-nums">{cellVal || '—'}</span>
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
            <div className="flex flex-col items-center justify-center h-48 text-secondary text-xs">
              <Database className="w-6 h-6 mb-1.5 opacity-40" />
              <span>Данных не найдено</span>
            </div>
          )
        )}
      </div>

      {/* Pagination Footer */}
      {data && data.totalPages > 1 && (
        <div className="p-2.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface text-xs text-secondary">
          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            <span>
              Всего строк:{' '}
              <strong className="text-primary tabular-nums">
                {data.total.toLocaleString()}
              </strong>
            </span>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1">
              <span>Стр.</span>
              <input
                type="number"
                min={1}
                max={data.totalPages}
                placeholder={String(page)}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && goToPage()}
                className="w-12 px-1.5 py-0.5 bg-surface-2 border border-border rounded-[4px] text-[11px] text-primary text-center tabular-nums focus:outline-none focus:border-accent"
              />
              <span>
                из{' '}
                <strong className="text-primary tabular-nums">
                  {data.totalPages}
                </strong>
              </span>
              <button
                onClick={goToPage}
                className="px-2 py-0.5 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border border-border text-[11px] transition-colors cursor-pointer"
              >
                Перейти
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-center">
            {/* First page button */}
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1 || loading}
              className="p-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 disabled:opacity-30 text-primary border border-border transition-colors cursor-pointer"
              title="В начало (первая страница)"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev page button */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 disabled:opacity-30 text-primary border border-border transition-colors cursor-pointer"
              title="Предыдущая страница"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Clickable Page Numbers with Ellipsis */}
            {(() => {
              const total = data.totalPages;
              const cur = page;
              const items: (number | 'ellipsis')[] = [];
              if (total <= 7) {
                for (let i = 1; i <= total; i++) items.push(i);
              } else {
                items.push(1);
                if (cur > 3) items.push('ellipsis');
                const start = Math.max(2, cur - 1);
                const end = Math.min(total - 1, cur + 1);
                for (let i = start; i <= end; i++) items.push(i);
                if (cur < total - 2) items.push('ellipsis');
                items.push(total);
              }

              return items.map((item, idx) => {
                if (item === 'ellipsis') {
                  return (
                    <span
                      key={`el-${idx}`}
                      className="px-1 text-secondary text-[11px]"
                    >
                      …
                    </span>
                  );
                }
                const isCurrent = item === cur;
                return (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    disabled={loading}
                    className={`min-w-[26px] h-6 px-1 rounded-[4px] text-[11px] tabular-nums font-medium transition-colors cursor-pointer border ${
                      isCurrent
                        ? 'bg-accent/15 border-accent text-accent'
                        : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
                    }`}
                  >
                    {item}
                  </button>
                );
              });
            })()}

            {/* Next page button */}
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages || loading}
              className="p-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 disabled:opacity-30 text-primary border border-border transition-colors cursor-pointer"
              title="Следующая страница"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last page button */}
            <button
              onClick={() => setPage(data.totalPages)}
              disabled={page >= data.totalPages || loading}
              className="p-1 rounded-[4px] bg-surface-2 hover:bg-surface-2/80 disabled:opacity-30 text-primary border border-border transition-colors cursor-pointer"
              title="В конец (последняя страница)"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
