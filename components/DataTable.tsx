'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronDown,
} from 'lucide-react';
import { SheetPaginatedResponse } from '@/lib/types';
import { formatPhoneDisplay, normalizePhoneWithDiagnostics } from '@/lib/phone-utils';
import { exportRowsToCSV, exportRowsToExcel } from '@/lib/csv-utils';
import { STATUS_CONFIG, StatusCategoryConfig } from '@/lib/status-config';
import { matchesCategory } from '@/lib/status-matcher';
import { Skeleton } from './ui/Skeleton';
import { Dropdown } from './ui/Dropdown';

import { showToast } from './ui/Toast';
import { Copy, CopyCheck } from 'lucide-react';

const STATUS_CATEGORY_OPTIONS: { id: string; name: string; config: StatusCategoryConfig }[] = [
  { id: 'link_sent', name: 'Ссылка отправлена', config: STATUS_CONFIG.linkSent },
  { id: 'repeat_sent', name: 'Повторная отправка', config: STATUS_CONFIG.repeatSent },
  { id: 'declined', name: 'Отказ', config: STATUS_CONFIG.declined },
  { id: 'already_registered', name: 'Уже зарегистрирован', config: STATUS_CONFIG.alreadyRegistered },
  { id: 'wrong_person', name: 'Не тот человек', config: STATUS_CONFIG.wrongPerson },
];

const parseComparableValue = (value: string): { kind: 'empty' | 'number' | 'date' | 'text'; value: number | string } => {
  const text = value.trim();
  if (!text) return { kind: 'empty', value: '' };

  const numeric = text.replace(/\s+/g, '').replace(/%$/, '').replace(',', '.');
  if (/^[-+]?\d+(?:\.\d+)?$/.test(numeric)) {
    return { kind: 'number', value: Number(numeric) };
  }

  const dateMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dateMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = dateMatch;
    return {
      kind: 'date',
      value: Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
    };
  }

  const isoTime = Date.parse(text);
  if (/^\d{4}-\d{2}-\d{2}/.test(text) && Number.isFinite(isoTime)) {
    return { kind: 'date', value: isoTime };
  }
  return { kind: 'text', value: text.toLocaleLowerCase('ru') };
};

const compareComparableValues = (left: string, right: string): number => {
  const a = parseComparableValue(left);
  const b = parseComparableValue(right);
  if (a.kind === 'empty' || b.kind === 'empty') {
    return a.kind === b.kind ? 0 : a.kind === 'empty' ? 1 : -1;
  }
  if (a.kind === b.kind && typeof a.value === typeof b.value) {
    return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  }
  return String(a.value).localeCompare(String(b.value), 'ru', { numeric: true, sensitivity: 'base' });
};

interface DataTableProps {
  sheetType: 'main' | 'numbers' | 'eskiz' | 'not_completed' | 'survey_attempts';
  title: string;
  startDate?: string;
  endDate?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ sheetType, title, startDate = '', endDate = '' }) => {
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
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([]);
  const [draftFilterValues, setDraftFilterValues] = useState<string[]>([]);
  const [filterMenuColumn, setFilterMenuColumn] = useState<string | null>(null);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [filterOptionSearch, setFilterOptionSearch] = useState('');
  const [selectedStatusCategory, setSelectedStatusCategory] = useState<string>('all');
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'all' | 'date'>('all');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPage = Number(params.get('page'));
    const urlPageSize = Number(params.get('pageSize'));
    if (Number.isFinite(urlPage) && urlPage > 0) setPage(urlPage);
    if ([25, 50, 100].includes(urlPageSize)) setPageSize(urlPageSize);
    setActiveSearch(params.get('search') || '');
    setSortColumn(params.get('sortBy'));
    setSortDirection(params.get('sortDirection') === 'desc' ? 'desc' : 'asc');
    setFilterColumn(params.get('filterColumn') || '');
    setFilterValue(params.get('filterValue') || '');
    setSelectedFilterValues((params.get('filterValues') || '').split('|').filter(Boolean));
  }, []);

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
    setPage(1);
  };

  const setSort = (col: string, direction: 'asc' | 'desc') => {
    setSortColumn(col);
    setSortDirection(direction);
    setPage(1);
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
      if (sortColumn) {
        params.append('sortBy', sortColumn);
        params.append('sortDirection', sortDirection);
      }
      if (filterColumn && filterValue.trim()) {
        params.append('filterColumn', filterColumn);
        params.append('filterValue', filterValue.trim());
      }
      if (filterColumn && selectedFilterValues.length > 0) {
        params.append('filterValues', selectedFilterValues.join('|'));
      }
      if (filterMenuColumn) params.append('filterOptionsColumn', filterMenuColumn);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/proxy/data/sheets/${sheetType}?${params.toString()}`);
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
  }, [sheetType, page, activeSearch, pageSize, sortColumn, sortDirection, filterColumn, filterValue, selectedFilterValues, filterMenuColumn, startDate, endDate]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    if (sortColumn) {
      url.searchParams.set('sortBy', sortColumn);
      url.searchParams.set('sortDirection', sortDirection);
    } else {
      url.searchParams.delete('sortBy');
      url.searchParams.delete('sortDirection');
    }
    if (activeSearch) url.searchParams.set('search', activeSearch);
    else url.searchParams.delete('search');
    if (filterColumn) {
      url.searchParams.set('filterColumn', filterColumn);
      if (filterValue.trim()) {
        url.searchParams.set('filterValue', filterValue.trim());
      } else {
        url.searchParams.delete('filterValue');
      }
    } else {
      url.searchParams.delete('filterColumn');
      url.searchParams.delete('filterValue');
    }
    window.history.replaceState(null, '', url);
    if (filterColumn && selectedFilterValues.length > 0) {
      url.searchParams.set('filterValues', selectedFilterValues.join('|'));
    } else {
      url.searchParams.delete('filterValues');
    }
    window.history.replaceState(null, '', url);
  }, [page, pageSize, sortColumn, sortDirection, activeSearch, filterColumn, filterValue, selectedFilterValues]);

  useEffect(() => {
    if (!filterMenuColumn) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFilterMenuColumn(null);
        setFilterMenuPosition(null);
      }
    };
    const closeOnResize = () => {
      setFilterMenuColumn(null);
      setFilterMenuPosition(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [filterMenuColumn]);

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

  // Compute phone occurrences across the current batch to detect duplicates
  const phoneCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!data?.rows) return counts;
    for (const r of data.rows) {
      for (const [k, v] of Object.entries(r)) {
        if (isPhoneColumn(k) && v) {
          const norm = normalizePhoneWithDiagnostics(String(v)).normalized;
          if (norm) {
            counts.set(norm, (counts.get(norm) || 0) + 1);
          }
        }
      }
    }
    return counts;
  }, [data?.rows]);

  const duplicatePhoneCount = useMemo(() => {
    let count = 0;
    phoneCounts.forEach((val) => {
      if (val > 1) count++;
    });
    return count;
  }, [phoneCounts]);

  const filterOptions = useMemo(() => {
    if (!filterMenuColumn || !data) return [];
    const source = data.filterOptions ?? data.rows.map((row) => String(row[filterMenuColumn] ?? ''));
    return Array.from(new Set(source))
      .sort(compareComparableValues)
      .filter((value) => value.toLowerCase().includes(filterOptionSearch.toLowerCase()));
  }, [data, filterMenuColumn, filterOptionSearch]);

  const applyColumnFilter = (column: string, values: string[]) => {
    setFilterColumn(values.length ? column : '');
    setFilterValue('');
    setSelectedFilterValues(values);
    setFilterMenuColumn(null);
    setFilterMenuPosition(null);
    setFilterOptionSearch('');
    setPage(1);
  };

  const openFilterMenu = (header: string, element: HTMLButtonElement) => {
    const rect = element.getBoundingClientRect();
    const width = Math.min(320, Math.max(280, window.innerWidth - 24));
    const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 520);
    setFilterMenuColumn(header);
    setDraftFilterValues(filterColumn === header ? selectedFilterValues : []);
    setFilterOptionSearch('');
    setFilterMenuPosition({ top: Math.max(12, top), left, width });
  };

  const filterMenu = filterMenuColumn && filterMenuPosition && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed z-[2147483647] max-h-[min(520px,calc(100dvh-24px))] overflow-hidden rounded-lg border border-border bg-surface p-3 text-left normal-case text-primary shadow-2xl ring-1 ring-black/20"
          style={{ top: filterMenuPosition.top, left: filterMenuPosition.left, width: filterMenuPosition.width }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-primary">
            <span className="truncate">Фильтр: {filterMenuColumn}</span>
            <button
              data-icon-button
              type="button"
              className="!h-6 !min-h-6 !w-6 !shrink-0 !p-0 text-secondary hover:text-primary"
              onClick={() => {
                setFilterMenuColumn(null);
                setFilterMenuPosition(null);
              }}
            >
              ×
            </button>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <button type="button" className="flex h-9 min-h-9 items-center justify-center rounded border border-border bg-surface-2 px-2 text-[11px] text-primary hover:bg-accent-soft hover:text-accent" onClick={() => {
              setSort(filterMenuColumn, 'asc');
              setFilterMenuColumn(null);
              setFilterMenuPosition(null);
            }}>
              Сортировка А → Я
            </button>
            <button type="button" className="flex h-9 min-h-9 items-center justify-center rounded border border-border bg-surface-2 px-2 text-[11px] text-primary hover:bg-accent-soft hover:text-accent" onClick={() => {
              setSort(filterMenuColumn, 'desc');
              setFilterMenuColumn(null);
              setFilterMenuPosition(null);
            }}>
              Сортировка Я → А
            </button>
          </div>
          <input
            value={filterOptionSearch}
            onChange={(event) => setFilterOptionSearch(event.target.value)}
            placeholder="Поиск значений"
            className="mb-2 h-10 w-full rounded border border-border bg-surface-2 px-2 text-xs text-primary"
          />
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <button type="button" className="h-8 text-accent hover:underline" onClick={() => setDraftFilterValues(filterOptions)}>Выделить всё</button>
            <button type="button" className="h-8 text-secondary hover:text-primary" onClick={() => setDraftFilterValues([])}>Очистить</button>
          </div>
          <div className="max-h-56 overflow-y-auto rounded border border-border bg-surface-2/50 py-1">
            {filterOptions.length > 0 ? filterOptions.map((value) => (
              <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2 px-2 text-xs text-primary hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={draftFilterValues.includes(value)}
                  onChange={(event) => setDraftFilterValues((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))}
                />
                <span className="truncate">{value || '(пусто)'}</span>
              </label>
            )) : (
              <div className="px-2 py-4 text-center text-xs text-secondary">Значения не найдены</div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="h-10 rounded border border-border bg-surface-2 px-3 text-xs text-primary hover:bg-surface-2/80" onClick={() => {
              setFilterMenuColumn(null);
              setFilterMenuPosition(null);
            }}>Отмена</button>
            <button type="button" className="h-10 rounded bg-accent px-3 text-xs font-medium text-white hover:bg-accent/90" onClick={() => applyColumnFilter(filterMenuColumn, draftFilterValues)}>Применить</button>
          </div>
        </div>,
        document.body,
      )
    : null;

  const handleCopyPhone = (phoneStr: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(phoneStr);
      setCopiedPhone(phoneStr);
      showToast(`Номер ${phoneStr} скопирован в буфер`, 'info');
      setTimeout(() => setCopiedPhone(null), 2000);
    }
  };

  const processedRows = useMemo(() => {
    if (!data?.rows) return [];
    let rows = [...data.rows];

    // Filter by status category if selected
    if (selectedStatusCategory !== 'all') {
      const catOption = STATUS_CATEGORY_OPTIONS.find((c) => c.id === selectedStatusCategory);
      if (catOption) {
        rows = rows.filter((r) => {
          const statusVal = r['Статус'] || r['Status'] || r['Коментарий'] || r['комментарий'] || '';
          return matchesCategory(statusVal, catOption.config);
        });
      }
    }

    // Filter by duplicates only if enabled
    if (onlyDuplicates) {
      rows = rows.filter((r) => {
        for (const [k, v] of Object.entries(r)) {
          if (isPhoneColumn(k) && v) {
            const norm = normalizePhoneWithDiagnostics(String(v)).normalized;
            if (norm && (phoneCounts.get(norm) || 0) > 1) {
              return true;
            }
          }
        }
        return false;
      });
    }

    return rows;
  }, [data?.rows, selectedStatusCategory, onlyDuplicates, phoneCounts]);

  const exportData = async (format: 'csv' | 'excel') => {
    if (exportMode === 'date' && (!exportFrom || !exportTo)) {
      showToast('Выберите даты «от» и «до» перед экспортом', 'info');
      return;
    }
    setExportLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100000', export: 'true' });
      const supportStartDate = exportMode === 'date' ? exportFrom : startDate;
      const supportEndDate = exportMode === 'date' ? exportTo : endDate;
      if (supportStartDate) params.set('startDate', supportStartDate);
      if (supportEndDate) params.set('endDate', supportEndDate);
      const response = await fetch(`/api/proxy/data/sheets/${sheetType}?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const fullData: SheetPaginatedResponse = await response.json();
      const dateHeader = fullData.headers.find((header) => {
        const normalized = header.toLowerCase();
        return normalized.includes('дата') || normalized.includes('date');
      });
      if (exportMode === 'date' && !dateHeader) {
        throw new Error('В активной таблице не найден столбец с датой');
      }
      const hasSupportFlag = fullData.headers.includes('ОТ поддержки?');
      const rows = exportMode === 'date' && dateHeader
        ? fullData.rows.filter((row) => {
            const value = String(row[dateHeader] ?? '');
            const date = new Date(value.split('.').reverse().join('-'));
            const iso = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
            const inDateRange = iso !== null
              && (!exportFrom || iso >= exportFrom)
              && (!exportTo || iso <= exportTo);
            if (inDateRange) return true;
            if (hasSupportFlag && row['ОТ поддержки?'] === 'Да') return true;
            return false;
          })
        : fullData.rows;
      const filename = exportMode === 'date'
        ? `${sheetType}_data_${exportFrom}_${exportTo}`
        : `${sheetType}_data_all`;
      if (format === 'csv') exportRowsToCSV(rows, fullData.headers, `${filename}.csv`);
      else exportRowsToExcel(rows, fullData.headers, filename);
      setExportOpen(false);
      showToast(`Экспортировано строк: ${rows.length}`, 'success');
    } catch (exportError) {
      showToast(exportError instanceof Error ? exportError.message : 'Ошибка экспорта', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full bg-surface border border-border rounded-[8px] overflow-visible flex flex-col">
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
            className="sm:hidden h-10 min-h-10 flex items-center gap-1 px-2 rounded-[4px] bg-surface-2 text-[10px] text-secondary border border-border"
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
              className="w-full h-10 min-h-10 pl-8 pr-12 bg-surface-2 border border-border focus:border-accent rounded-[6px] text-xs text-primary placeholder-secondary transition-colors"
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

          {filterColumn && (
            <div className="flex items-center gap-1">
              <input
                value={filterValue}
                onChange={(event) => {
                  setFilterValue(event.target.value);
                  setPage(1);
                }}
                placeholder={`Фильтр: ${filterColumn}`}
                className="w-36 h-8 px-2 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => {
                  setFilterColumn('');
                  setFilterValue('');
                  setPage(1);
                }}
                className="text-[10px] text-secondary hover:text-primary"
              >
                ✕
              </button>
            </div>
          )}

          {/* Status category filter */}
          <div className="w-36">
            <Dropdown
              value={selectedStatusCategory}
              onChange={setSelectedStatusCategory}
              ariaLabel="Фильтр по категории статуса"
              options={[
                { value: 'all', label: 'Все статусы' },
                ...STATUS_CATEGORY_OPTIONS.map((cat) => ({ value: cat.id, label: cat.name })),
              ]}
            />
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

          {/* Duplicate phone filter toggle */}
          <button
            type="button"
            onClick={() => setOnlyDuplicates(!onlyDuplicates)}
            className={`h-10 min-h-10 flex items-center gap-1.5 px-2.5 rounded-[6px] border text-xs font-medium transition-all cursor-pointer ${
              onlyDuplicates
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold'
                : duplicatePhoneCount > 0
                ? 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
                : 'bg-surface-2/40 text-secondary/50 border-border/50 cursor-not-allowed'
            }`}
            disabled={duplicatePhoneCount === 0}
            title={
              duplicatePhoneCount > 0
                ? `Найдено ${duplicatePhoneCount} повторяющихся номеров. Нажмите для фильтрации.`
                : 'Повторяющиеся номера не найдены в текущей выборке'
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Дубликаты</span>
            {duplicatePhoneCount > 0 && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
                {duplicatePhoneCount}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((open) => !open)}
              disabled={!data || exportLoading}
              className="h-10 min-h-10 flex items-center justify-center gap-1.5 px-2.5 rounded-[6px] bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 disabled:opacity-40 text-emerald-700 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-700/50 text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-10 z-30 w-64 p-3 rounded-lg border border-border bg-surface shadow-xl">
                <div className="mb-2 text-xs font-semibold text-primary">Экспорт активной таблицы</div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setExportMode('all')} className={`h-10 rounded border text-xs ${exportMode === 'all' ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface-2 text-primary'}`}>Вся таблица</button>
                  <button type="button" onClick={() => setExportMode('date')} className={`h-10 rounded border text-xs ${exportMode === 'date' ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface-2 text-primary'}`}>По дате</button>
                </div>
                {exportMode === 'date' && (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <input aria-label="Дата от" type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} className="h-10 min-w-0 w-full px-2 rounded border border-border bg-surface-2 text-xs text-primary" />
                    <input aria-label="Дата до" type="date" value={exportTo} onChange={(event) => setExportTo(event.target.value)} className="h-10 min-w-0 w-full px-2 rounded border border-border bg-surface-2 text-xs text-primary" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={exportMode === 'date' && (!exportFrom || !exportTo)} onClick={() => exportData('excel')} className="h-10 rounded border border-emerald-300/60 bg-emerald-50 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 disabled:opacity-40">Excel</button>
                  <button type="button" disabled={exportMode === 'date' && (!exportFrom || !exportTo)} onClick={() => exportData('csv')} className="h-10 rounded border border-border bg-surface-2 text-xs text-primary disabled:opacity-40">CSV</button>
                </div>
              </div>
            )}
          </div>

          <Dropdown
            value={String(pageSize)}
            onChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
            ariaLabel="Количество строк на странице"
            className="w-20"
            options={[15, 25, 50, 100, 250, 500].map((value) => ({ value: String(value), label: String(value) }))}
          />
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
      <div className="relative min-h-[400px] overflow-visible">
        {loading && !data ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-[4px]" />
            ))}
          </div>
        ) : data && processedRows.length > 0 ? (
          <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-gutter:stable]">
          <table className="min-w-max w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-surface-2 text-secondary font-semibold border-b border-border z-10 text-xs uppercase tracking-wide">
              <tr>
                <th className="py-3 px-3 w-12 text-center text-secondary sticky left-0 bg-surface-2 z-20 shadow-[1px_0_0_var(--border-color)]">
                  #
                </th>
                {data.headers.map((header) => {
                  const isPriority = isPriorityMobileColumn(header);
                  const isCurrentSort = sortColumn === header;
                  return (
                    <th
                      key={header}
                      onClick={() => handleSort(header)}
                      className={`relative py-3 px-3 whitespace-nowrap font-semibold cursor-pointer select-none hover:bg-surface-2/80 hover:text-primary transition-colors group ${
                        !isPriority && !showAllColumnsMobile ? 'hidden sm:table-cell' : ''
                      }`}
                      title="Кликните для сортировки по этой колонке"
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>{header}</span>
                        <button
                          data-icon-button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (filterMenuColumn === header) {
                              setFilterMenuColumn(null);
                              setFilterMenuPosition(null);
                            } else {
                              openFilterMenu(header, event.currentTarget);
                            }
                          }}
                          className={`!h-5 !min-h-5 !w-5 !p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${filterColumn === header ? 'text-accent' : ''}`}
                          title={`Фильтр по столбцу ${header}`}
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                        {isCurrentSort ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-accent shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-accent shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-secondary opacity-40 group-hover:opacity-100 shrink-0" />
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
                    style={{
                      animationDelay: `${Math.min(idx * 15, 200)}ms`,
                    }}
                    className="hover:bg-surface-2/50 transition-colors odd:bg-surface-2/20 border-b border-border/40 last:border-0 sm:animate-fade-in"
                  >
                    <td className="py-2.5 px-3 text-center text-secondary font-mono text-xs sticky left-0 bg-surface z-10 shadow-[1px_0_0_var(--border-color)] tabular-nums">
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

                      // Use fuzzy semantic matching for status badge coloring (same logic as backend)
                      let statusBadgeColor = '';
                      if (isStatus && cellVal) {
                        if (matchesCategory(cellVal, STATUS_CONFIG.declined) || matchesCategory(cellVal, STATUS_CONFIG.wrongPerson)) {
                          statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30';
                        } else if (matchesCategory(cellVal, STATUS_CONFIG.alreadyRegistered)) {
                          statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';
                        } else if (matchesCategory(cellVal, STATUS_CONFIG.linkSent)) {
                          statusBadgeColor = 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30';
                        } else if (matchesCategory(cellVal, STATUS_CONFIG.repeatSent)) {
                          statusBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30';
                        } else {
                          const s = cellVal.toLowerCase();
                          if (s === 'delivered' || s === 'accepted') {
                            statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';
                          } else if (s === 'rejected') {
                            statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30';
                          } else {
                            statusBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50';
                          }
                        }
                      }

                      return (
                        <td
                          key={header}
                          className={`py-2.5 px-3 text-primary max-w-sm truncate text-xs ${
                            !isPriority && !showAllColumnsMobile ? 'hidden sm:table-cell' : ''
                          }`}
                          title={cellVal}
                        >
                          {isPhone && cellVal ? (
                            <div className="inline-flex items-center gap-1.5 group/phone">
                              <span className="font-mono text-primary bg-surface-2 px-2 py-1 rounded-[6px] border border-border tabular-nums text-xs">
                                {formatPhoneDisplay(phoneDiag?.normalized || cellVal, phoneDiag?.country)}
                              </span>
                              {phoneDiag && phoneDiag.country !== 'UZ' && phoneDiag.country !== 'UNKNOWN' && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 border border-border text-secondary font-medium">
                                  {phoneDiag.country}
                                </span>
                              )}
                              {phoneDiag?.normalized && (phoneCounts.get(phoneDiag.normalized) || 0) > 1 && (
                                <span
                                  className="text-[11px] px-1.5 py-0.5 rounded-[4px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium"
                                  title={`Номер встречается ${phoneCounts.get(phoneDiag.normalized)} раз в текущей выборке`}
                                >
                                  Повтор ({phoneCounts.get(phoneDiag.normalized)}x)
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(phoneDiag?.normalized || cellVal)}
                                className="opacity-0 group-hover/phone:opacity-100 transition-opacity p-1 hover:bg-surface-2 text-secondary hover:text-primary rounded cursor-pointer"
                                title="Скопировать номер в буфер обмена"
                              >
                                {copiedPhone === (phoneDiag?.normalized || cellVal) ? (
                                  <CopyCheck className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : isStatus && cellVal ? (
                            <span
                              className={`inline-block font-semibold px-2.5 py-1 rounded-[6px] border text-xs leading-tight ${statusBadgeColor}`}
                            >
                              {cellVal}
                            </span>
                          ) : (
                            <span className="tabular-nums text-xs">{cellVal || <span className="text-secondary/40">—</span>}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center h-48 text-secondary text-xs gap-2">
              <Database className="w-6 h-6 opacity-40" />
              <span>
                {selectedStatusCategory !== 'all'
                  ? 'Нет строк с выбранным статусом на этой странице'
                  : 'Данных не найдено'}
              </span>
              {selectedStatusCategory !== 'all' && (
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
      {filterMenu}

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
