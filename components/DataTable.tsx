'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Database, AlertCircle, Download } from 'lucide-react';
import { SheetPaginatedResponse } from '@/lib/types';
import { formatPhoneDisplay } from '@/lib/phone-utils';

interface DataTableProps {
  sheetType: 'main' | 'numbers' | 'eskiz';
  title: string;
}

export const DataTable: React.FC<DataTableProps> = ({ sheetType, title }) => {
  const [data, setData] = useState<SheetPaginatedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
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

  // Determine key columns to highlight
  const isPhoneColumn = (header: string) => {
    const h = header.toLowerCase();
    return h.includes('phone') || h.includes('телефон') || h.includes('номер');
  };

  const isStatusColumn = (header: string) => {
    const h = header.toLowerCase();
    return h.includes('статус') || h.includes('status');
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

    const csvContent = '\uFEFF' + csvLines.join('\n'); // Add BOM for Excel UTF-8 compatibility
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
          {data && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {data.total.toLocaleString()} строк
            </span>
          )}
        </div>

        {/* Search, Download CSV & Page Size */}
        <div className="flex items-center flex-wrap gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск по номеру или тексту..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-16 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
              >
                Сброс
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={downloadCSV}
            disabled={!data || data.rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Скачать текущие отфильтрованные строки как CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Скачать как CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value={15}>15 на стр.</option>
            <option value={25}>25 на стр.</option>
            <option value={50}>50 на стр.</option>
            <option value={100}>100 на стр.</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="m-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <div>
            <div className="font-semibold">Ошибка загрузки таблицы</div>
            <div className="text-rose-400/80 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Table Container with virtualized scroll */}
      <div className="overflow-x-auto relative min-h-[350px] max-h-[550px] scrollbar-thin scrollbar-thumb-slate-700">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Загрузка данных...</span>
            </div>
          </div>
        )}

        {data && data.rows.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 z-1">
              <tr>
                <th className="py-3 px-3 w-12 text-center text-slate-500">#</th>
                {data.headers.map((header) => (
                  <th
                    key={header}
                    className="py-3 px-3 whitespace-nowrap tracking-wider uppercase text-[11px]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.rows.map((row, idx) => {
                const rowIndex = (data.page - 1) * data.pageSize + idx + 1;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-slate-800/40 transition-colors odd:bg-slate-900/20"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[10px]">
                      {rowIndex}
                    </td>
                    {data.headers.map((header) => {
                      const cellVal = row[header] || '';
                      const isPhone = isPhoneColumn(header);
                      const isStatus = isStatusColumn(header);

                      return (
                        <td
                          key={header}
                          className="py-2.5 px-3 whitespace-nowrap text-slate-300 max-w-xs truncate"
                          title={cellVal}
                        >
                          {isPhone && cellVal ? (
                            <span className="font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              {formatPhoneDisplay(cellVal)}
                            </span>
                          ) : isStatus && cellVal ? (
                            <span className="font-medium text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {cellVal}
                            </span>
                          ) : (
                            cellVal || <span className="text-slate-600">—</span>
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
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs">
              <Database className="w-8 h-8 mb-2 opacity-30" />
              <span>Данных не найдено</span>
              {activeSearch && (
                <span className="mt-1 text-slate-400">по запросу &quot;{activeSearch}&quot;</span>
              )}
            </div>
          )
        )}
      </div>

      {/* Pagination Bar */}
      {data && (
        <div className="p-3 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950 text-xs text-slate-400">
          <div>
            Показаны строки с {(data.page - 1) * data.pageSize + 1} по{' '}
            {Math.min(data.page * data.pageSize, data.total)} из {data.total.toLocaleString()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-white">
              {data.page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
