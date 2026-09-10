'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';
import { SheetPaginatedResponse } from '@/lib/types';
import { formatPhoneDisplay, normalizePhoneWithDiagnostics } from '@/lib/phone-utils';
import { exportRowsToCSV, exportRowsToExcel } from '@/lib/csv-utils';
import { STATUS_CONFIG, StatusCategoryConfig } from '@/lib/status-config';
import { matchesCategory } from '@/lib/status-matcher';
import { Skeleton } from './ui/Skeleton';

const STATUS_CATEGORY_OPTIONS: { id: string; name: string; config: StatusCategoryConfig }[] = [
  { id: 'link_sent', name: 'Ссылка отправлена', config: STATUS_CONFIG.linkSent },
  { id: 'repeat_sent', name: 'Повторная отправка', config: STATUS_CONFIG.repeatSent },
  { id: 'declined', name: 'Отказ', config: STATUS_CONFIG.declined },
  { id: 'already_registered', name: 'Уже зарегистрирован', config: STATUS_CONFIG.alreadyRegistered },
  { id: 'wrong_person', name: 'Не тот человек', config: STATUS_CONFIG.wrongPerson },
];

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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedStatusCategory, setSelectedStatusCategory] = useState<string>('all');
  const [, startTransition] = useTransition();

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

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

  const processedRows = useMemo(() => {
    if (!data?.rows) return [];
    let rows = [...data.rows];

    if (selectedStatusCategory !== 'all') {
      const catOption = STATUS_CATEGORY_OPTIONS.find((c) => c.id === selectedStatusCategory);
      if (catOption) {
        rows = rows.filter((r) => {
          const statusVal = r['Статус'] || r['Status'] || r['Коментарий'] || r['комментарий'] || '';
          return matchesCategory(statusVal, catOption.config);
        });
      }
    }

    if (sortColumn) {
      rows.sort((a, b) => {
        const valA = a[sortColumn] ?? '';
        const valB = b[sortColumn] ?? '';
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB), 'ru')
          : String(valB).localeCompare(String(valA), 'ru');
      });
    }

    return rows;
  }, [data?.rows, sortColumn, sortDirection, selectedStatusCategory]);

  const downloadCSV = () => {
    if (!processedRows.length || !data) return;
    const filename = `${sheetType}_data_${new Date().toISOString().slice(0, 10)}.csv`;
    exportRowsToCSV(processedRows, data.headers, filename);
  };

  const downloadExcel = () => {
    if (!processedRows.length || !data) return;
    const filename = `${sheetType}_data_${new Date().toISOString().slice(0, 10)}`;
    exportRowsToExcel(processedRows, data.headers, filename);
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

          {/* Status category filter */}
          <div className="flex items-center gap-1 bg-surface-2 px-2 py-1 rounded-[6px] border border-border">
            <Filter className="w-3 h-3 text-secondary shrink-0" />
            <select
              value={selectedStatusCategory}
              onChange={(e) => setSelectedStatusCategory(e.target.value)}
              className="bg-transparent text-xs text-primary focus:outline-none cursor-pointer max-w-[140px] truncate"
              title="Фильтр по категории статуса"
            >
              <option value="all">Все статусы</option>
              {STATUS_CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {selectedStatusCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedStatusCategory('all')}
                className="text-[10px] text-secondary hover:text-primary ml-0.5"
                title="Сбросить фильтр статуса"
              >
                ✕
              </button>
            )}
          </div>

          {/* Export Excel (.xlsx) */}
          <button
            type="button"
            onClick={downloadExcel}
            disabled={!processedRows || processedRows.length === 0}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 disabled:opacity-40 text-emerald-700 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-700/50 text-xs font-medium transition-colors cursor-pointer"
            title="Экспорт в Excel (.xlsx / XML)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={downloadCSV}
            disabled={!processedRows || processedRows.length === 0}
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
        ) : data && processedRows.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-surface-2 text-secondary font-medium border-b border-border z-10 text-[11px]">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center text-secondary sticky left-0 bg-surface-2 z-20 shadow-[1px_0_0_var(--border-color)]">
                  #
                </th>
                {data.headers.map((header) => {
                  const isPriority = isPriorityMobileColumn(header);
                  const isCurrentSort = sortColumn === header;
                  return (
                    <th
                      key={header}
                      onClick={() => handleSort(header)}
                      className={`py-2 px-2.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-surface-2/80 hover:text-primary transition-colors group ${
                        !isPriority && !showAllColumnsMobile ? 'hidden sm:table-cell' : ''
                      }`}
                      title="Кликните для сортировки по этой колонке"
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>{header}</span>
                        {isCurrentSort ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-accent shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-accent shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-secondary opacity-40 group-hover:opacity-100 shrink-0" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {processedRows.map((row, idx) => {
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
                            (() => {
                              const s = cellVal.toLowerCase();
                              let badgeColor =
                                'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50';
                              if (
                                s.includes('отказ') ||
                                s.includes('нет времени') ||
                                s.includes('бросил') ||
                                s.includes('ошибка') ||
                                s.includes('не тот') ||
                                s.includes('неправильн')
                              ) {
                                badgeColor =
                                  'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30';
                              } else if (
                                s.includes('зарегистр') ||
                                s.includes('успеш') ||
                                s.includes('delivered') ||
                                s.includes('accepted') ||
                                s.includes('актив') ||
                                s.includes('готов')
                              ) {
                                badgeColor =
                                  'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';
                              } else if (
                                s.includes('отправлен') ||
                                s.includes('ссылк') ||
                                s.includes('повтор') ||
                                s.includes('смс') ||
                                s.includes('sms')
                              ) {
                                badgeColor =
                                  'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30';
                              } else if (
                                s.includes('ожидает') ||
                                s.includes('в процессе') ||
                                s.includes('не ответил') ||
                                s.includes('перезвон')
                              ) {
                                badgeColor =
                                  'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30';
                              }
                              return (
                                <span
                                  className={`inline-block font-medium px-2 py-0.5 rounded-[4px] border text-[11px] leading-tight ${badgeColor}`}
                                >
                                  {cellVal}
                                </span>
                              );
                            })()
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
            <div className="flex flex-col items-center justify-center h-48 text-secondary text-xs gap-2">
              <Database className="w-6 h-6 opacity-40" />
              <span>
                {selectedStatusCategory !== 'ALL'
                  ? 'Нет строк с выбранным статусом на этой странице'
                  : 'Данных не найдено'}
              </span>
              {selectedStatusCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedStatusCategory('ALL')}
                  className="px-2.5 py-1 text-[11px] rounded-[4px] bg-surface-2 border border-border text-primary hover:bg-surface-2/80 transition-colors"
                >
                  Сбросить фильтр статуса
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* Pagination Footer */}
      {data && data.totalPages > 1 && (
        <div className="p-2.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-surface text-xs text-secondary">
          <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-start gap-2 text-[11px]">
            <span>
              Всего строк:{' '}
              <strong className="text-primary tabular-nums">
                {data.total.toLocaleString()}
              </strong>
            </span>
            <span className="hidden sm:inline text-border">|</span>
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
