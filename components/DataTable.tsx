'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef, useCallback } from 'react';
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
  RefreshCw,
  Settings2,
  Bookmark,
  BookmarkPlus,
  X,
  Loader2,
  RotateCcw,
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

const CACHE_TTL_MS = 30_000;
const DEBOUNCE_MS = 400;
const SESSION_CACHE_PREFIX = 'hurmo-datatable-cache-';

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

interface SessionCacheEntry {
  value: SheetPaginatedResponse;
  timestamp: number;
}

const readCache = (key: string): SheetPaginatedResponse | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionCacheEntry;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
};

const writeCache = (key: string, value: SheetPaginatedResponse) => {
  try {
    const entry: SessionCacheEntry = { value, timestamp: Date.now() };
    sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* ignore quota errors */
  }
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
  const [autoRefreshVersion, setAutoRefreshVersion] = useState(0);
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
  const [syncVersion, setSyncVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
  const [compactRows, setCompactRows] = useState(false);
  const [showRowNumbers, setShowRowNumbers] = useState(true);
  const [savedFilters, setSavedFilters] = useState<{ name: string; search: string; column: string; value: string; values: string[] }[]>([]);
  const [savedFilterName, setSavedFilterName] = useState('');
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [, startTransition] = useTransition();

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryKeyRef = useRef<string>('');
  const lastFetchTimestampRef = useRef<number>(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const manualRetryRef = useRef<{ params: URLSearchParams } | null>(null);
  const dataRef = useRef<SheetPaginatedResponse | null>(null);

  const buildQueryString = useCallback((p = page, search = activeSearch, size = pageSize) => {
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
    return params;
  }, [page, activeSearch, pageSize, sortColumn, sortDirection, filterColumn, filterValue, selectedFilterValues, filterMenuColumn, startDate, endDate]);

  const startProgressAnimation = () => {
    setLoadProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    let progress = 0;
    progressTimerRef.current = setInterval(() => {
      progress = Math.min(progress + Math.random() * 18, 92);
      setLoadProgress(progress);
    }, 250);
  };

  const stopProgressAnimation = (final = 100) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setLoadProgress(final);
    setTimeout(() => setLoadProgress(0), 300);
  };

  const fetchData = useCallback(async (p = page, search = activeSearch, size = pageSize) => {
    const params = buildQueryString(p, search, size);
    const queryKey = `${sheetType}:${params.toString()}`;
    const now = Date.now();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const doFetch = async () => {
      if (queryKey === lastQueryKeyRef.current && now - lastFetchTimestampRef.current < DEBOUNCE_MS) {
        return;
      }

      const cached = readCache(queryKey);
      if (cached) {
        setData(cached);
        dataRef.current = cached;
        setError(null);
        setLoading(false);
        stopProgressAnimation(100);
        lastQueryKeyRef.current = queryKey;
        lastFetchTimestampRef.current = now;
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      manualRetryRef.current = { params };

      setLoading(true);
      setError(null);
      startProgressAnimation();

      try {
        const res = await fetch(`/api/proxy/data/sheets/${sheetType}?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `HTTP ${res.status}`);
        }
        const json: SheetPaginatedResponse = await res.json();
        if (controller.signal.aborted) return;
        setData(json);
        dataRef.current = json;
        setError(null);
        writeCache(queryKey, json);
        lastQueryKeyRef.current = queryKey;
        lastFetchTimestampRef.current = now;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Ошибка загрузки данных';
        setError(message);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setLoading(false);
        stopProgressAnimation(100);
      }
    };

    debounceTimerRef.current = setTimeout(doFetch, dataRef.current ? DEBOUNCE_MS : 0);
  }, [page, activeSearch, pageSize, buildQueryString, sheetType]);

  const retryLastFetch = () => {
    if (!manualRetryRef.current) {
      fetchData();
      return;
    }
    const { params } = manualRetryRef.current;
    const p = Number(params.get('page')) || page;
    const search = params.get('search') || activeSearch;
    const size = Number(params.get('pageSize')) || pageSize;
    fetchData(p, search, size);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPage = Number(params.get('page'));
    const urlPageSize = Number(params.get('pageSize'));
    if (Number.isFinite(urlPage) && urlPage > 0) setPage(urlPage);
    if ([10, 15, 25, 50, 100, 250, 500].includes(urlPageSize)) setPageSize(urlPageSize);
    setActiveSearch(params.get('search') || '');
    setSortColumn(params.get('sortBy'));
    setSortDirection(params.get('sortDirection') === 'desc' ? 'desc' : 'asc');
    setFilterColumn(params.get('filterColumn') || '');
    setFilterValue(params.get('filterValue') || '');
    setSelectedFilterValues((params.get('filterValues') || '').split('|').filter(Boolean));
    const settings = localStorage.getItem(`hurmo-table-settings-${sheetType}`);
    if (settings) {
      try {
        const parsed = JSON.parse(settings) as { compactRows?: boolean; showRowNumbers?: boolean };
        setCompactRows(Boolean(parsed.compactRows));
        setShowRowNumbers(parsed.showRowNumbers !== false);
      } catch { /* ignore malformed local settings */ }
    }
    const filters = localStorage.getItem(`hurmo-saved-filters-${sheetType}`);
    if (filters) {
      try { setSavedFilters(JSON.parse(filters)); } catch { /* ignore malformed saved filters */ }
    }
  }, [sheetType]);

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

  useEffect(() => {
    const handleSettingsChange = () => setAutoRefreshVersion((version) => version + 1);
    window.addEventListener('hurmo:auto-refresh-changed', handleSettingsChange);
    return () => window.removeEventListener('hurmo:auto-refresh-changed', handleSettingsChange);
  }, []);

  useEffect(() => {
    const minutes = Number(localStorage.getItem('hurmo_auto_refresh_interval') || '0');
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const timer = window.setInterval(() => {
      const queryKey = lastQueryKeyRef.current;
      if (queryKey) {
        try {
          sessionStorage.removeItem(SESSION_CACHE_PREFIX + queryKey);
        } catch { /* ignore */ }
      }
      fetchData(page, activeSearch, pageSize);
    }, minutes * 60_000);
    return () => window.clearInterval(timer);
  }, [page, activeSearch, pageSize, sheetType, syncVersion, autoRefreshVersion, fetchData]);

  useEffect(() => {
    fetchData(page, activeSearch, pageSize);
  }, [sheetType, page, activeSearch, pageSize, sortColumn, sortDirection, filterColumn, filterValue, selectedFilterValues, filterMenuColumn, startDate, endDate, syncVersion, fetchData]);

  useEffect(() => {
    const handleSync = () => setSyncVersion((version) => version + 1);
    window.addEventListener('hurmo:sync', handleSync);
    return () => window.removeEventListener('hurmo:sync', handleSync);
  }, []);

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

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

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

  const syncSheet = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/proxy/data/sheets/${sheetType}?sync=1`, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showToast('Синхронизация запущена', 'success');
      window.dispatchEvent(new Event('hurmo:sync'));
      setSyncVersion((version) => version + 1);
    } catch (syncError) {
      showToast(syncError instanceof Error ? syncError.message : 'Ошибка синхронизации', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const persistTableSettings = (next: { compactRows?: boolean; showRowNumbers?: boolean }) => {
    const settings = {
      compactRows: next.compactRows ?? compactRows,
      showRowNumbers: next.showRowNumbers ?? showRowNumbers,
    };
    setCompactRows(settings.compactRows);
    setShowRowNumbers(settings.showRowNumbers);
    localStorage.setItem(`hurmo-table-settings-${sheetType}`, JSON.stringify(settings));
  };

  const saveCurrentFilter = () => {
    const name = savedFilterName.trim();
    if (!name) return;
    const next = [...savedFilters.filter((filter) => filter.name !== name), {
      name,
      search: activeSearch,
      column: filterColumn,
      value: filterValue,
      values: selectedFilterValues,
    }];
    setSavedFilters(next);
    localStorage.setItem(`hurmo-saved-filters-${sheetType}`, JSON.stringify(next));
    setSavedFilterName('');
    showToast('Фильтр сохранён', 'success');
  };

  const applySavedFilter = (filter: typeof savedFilters[number]) => {
    setSearchInput(filter.search);
    setActiveSearch(filter.search);
    setFilterColumn(filter.column);
    setFilterValue(filter.value);
    setSelectedFilterValues(filter.values);
    setPage(1);
  };

  const deleteSavedFilter = (name: string) => {
    const next = savedFilters.filter((filter) => filter.name !== name);
    setSavedFilters(next);
    localStorage.setItem(`hurmo-saved-filters-${sheetType}`, JSON.stringify(next));
  };

  const isPhoneColumn = (header: string) => {
    const h = header.toLowerCase();
    return h.includes('phone') || h.includes('телефон') || h.includes('номер');
  };

  const isStatusColumn = (header: string) => {
    const h = header.toLowerCase();
    return h.includes('статус') || h.includes('status');
  };

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

    if (selectedStatusCategory !== 'all') {
      const catOption = STATUS_CATEGORY_OPTIONS.find((c) => c.id === selectedStatusCategory);
      if (catOption) {
        rows = rows.filter((r) => {
          const statusVal = r['Статус'] || r['Status'] || r['Коментарий'] || r['комментарий'] || '';
          return matchesCategory(statusVal, catOption.config);
        });
      }
    }

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
      const rows = exportMode === 'date' && dateHeader
        ? fullData.rows.filter((row) => {
            const value = String(row[dateHeader] ?? '').trim();
            if (!value) return false;
            const parsed = parseComparableValue(value);
            if (parsed.kind !== 'date') return false;
            const rowDate = new Date(parsed.value as number);
            const yyyy = rowDate.getUTCFullYear();
            const mm = String(rowDate.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(rowDate.getUTCDate()).padStart(2, '0');
            const iso = `${yyyy}-${mm}-${dd}`;
            return (!exportFrom || iso >= exportFrom) && (!exportTo || iso <= exportTo);
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

  const showProgressBar = loading && loadProgress > 0;

  return (
    <div className="w-full min-w-0 max-w-full bg-surface border border-border rounded-[8px] overflow-visible flex flex-col">
      {/* Progress bar overlay in header */}
      {showProgressBar && (
        <div className="h-[2px] w-full bg-surface-2 overflow-hidden rounded-t-[8px]">
          <div
            className="h-full bg-accent transition-all duration-200 ease-out"
            style={{ width: `${Math.round(loadProgress)}%` }}
          />
        </div>
      )}
      {/* Controls Bar */}
      <div className="p-3 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Database className={`w-3.5 h-3.5 text-secondary ${loading ? 'opacity-30' : ''}`} />
              {loading && (
                <Loader2 className="w-3.5 h-3.5 text-accent absolute top-0 left-0 animate-spin" />
              )}
            </div>
            <h3 className="text-xs font-semibold text-primary flex items-center gap-2">
              {title}
              {loading && data && (
                <span className="text-[10px] text-accent font-normal tabular-nums">
                  {Math.round(loadProgress)}%
                </span>
              )}
            </h3>
            {data && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border tabular-nums ${loading && !showProgressBar ? 'opacity-50' : ''}`}>
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
          {savedFilters.length > 0 && (
            <select
              aria-label="Сохранённые фильтры"
              value=""
              onChange={(event) => {
        const selected = savedFilters.find((filter) => filter.name === event.target.value);
        if (selected) applySavedFilter(selected);
              }}
              className="h-10 max-w-40 rounded-[6px] border border-border bg-surface-2 px-2 text-xs text-primary"
            >
              <option value="">Сохранённые фильтры</option>
              {savedFilters.map((filter) => <option key={filter.name} value={filter.name}>{filter.name}</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={syncSheet}
            disabled={syncing}
            className="inline-flex h-10 items-center gap-1.5 rounded-[6px] border border-border bg-surface-2 px-2.5 text-xs text-secondary hover:text-primary disabled:opacity-50"
            title={`Синхронизировать таблицу «${title}»`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-accent' : ''}`} />
            <span className="hidden lg:inline">{syncing ? 'Синхронизация…' : 'Синхронизировать'}</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setTableSettingsOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-1.5 rounded-[6px] border border-border bg-surface-2 px-2.5 text-xs text-secondary hover:text-primary"
              aria-expanded={tableSettingsOpen}
            >
              <Settings2 className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Вид</span>
            </button>
            {tableSettingsOpen && (
              <div className="absolute right-0 top-11 z-30 w-56 rounded-lg border border-border bg-surface p-3 text-xs text-primary shadow-xl">
        <label className="flex items-center justify-between gap-2 py-1.5">
          <span>Компактные строки</span>
          <input type="checkbox" checked={compactRows} onChange={(event) => persistTableSettings({ compactRows: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-2 py-1.5">
          <span>Номера строк</span>
          <input type="checkbox" checked={showRowNumbers} onChange={(event) => persistTableSettings({ showRowNumbers: event.target.checked })} />
        </label>
        <div className="mt-2 border-t border-border pt-2">
          <label className="mb-1 block text-[10px] text-secondary">Название текущего фильтра</label>
          <div className="flex gap-1">
            <input value={savedFilterName} onChange={(event) => setSavedFilterName(event.target.value)} placeholder="Например: Просроченные" className="h-8 min-w-0 flex-1 rounded border border-border bg-surface-2 px-2 text-[11px]" />
            <button type="button" onClick={saveCurrentFilter} className="h-8 rounded bg-accent px-2 text-white" title="Сохранить фильтр"><BookmarkPlus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        {savedFilters.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border pt-2">
            {savedFilters.map((filter) => (
              <div key={filter.name} className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => applySavedFilter(filter)} className="truncate text-left hover:text-accent"><Bookmark className="mr-1 inline h-3 w-3" />{filter.name}</button>
                <button type="button" onClick={() => deleteSavedFilter(filter.name)} className="text-secondary hover:text-rose-500" title="Удалить"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
              </div>
            )}
          </div>
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
            options={[10, 15, 25, 50, 100, 250, 500].map((value) => ({ value: String(value), label: String(value) }))}
          />
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="m-3 p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          <div className="flex items-center gap-2 flex-1">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1">
              <div className="font-semibold text-rose-700 dark:text-rose-300 mb-0.5">Ошибка загрузки данных</div>
              <div className="text-[11px] opacity-90">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={retryLastFetch}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            Повторить
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="relative min-h-[400px] overflow-visible">
        {loading && !data ? (
          <div className="p-3 space-y-2">
            {/* Header skeleton row */}
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={`hdr-${i}`} className="h-6 w-24 rounded-[4px]" />
              ))}
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-[10px] text-secondary tabular-nums w-10 text-center shrink-0">
                  {Math.round(loadProgress) > 0 ? `${Math.min(Math.round(loadProgress + (i * 5)), 95)}%` : `—`}
                </div>
                <Skeleton className="h-8 flex-1 rounded-[4px]" />
                <Skeleton className="h-8 w-32 rounded-[4px] hidden sm:block" />
                <Skeleton className="h-8 w-40 rounded-[4px] hidden md:block" />
                <Skeleton className="h-8 w-20 rounded-[4px] hidden lg:block" />
              </div>
            ))}
          </div>
        ) : data && processedRows.length > 0 ? (
          <div className={`w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-gutter:stable] ${loading ? 'opacity-70 pointer-events-none select-none' : ''} transition-opacity duration-200`}>
          <table className="min-w-max w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-surface-2 text-secondary font-semibold border-b border-border z-10 text-xs uppercase tracking-wide">
              <tr>
                {showRowNumbers && (
                  <th className="py-3 px-3 w-12 text-center text-secondary sticky left-0 bg-surface-2 z-20 shadow-[1px_0_0_var(--border-color)]">#</th>
                )}
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
                    {showRowNumbers && (
                      <td className={`${compactRows ? 'py-1.5' : 'py-2.5'} px-3 text-center text-secondary font-mono text-xs sticky left-0 bg-surface z-10 shadow-[1px_0_0_var(--border-color)] tabular-nums`}>{rowIndex}</td>
                    )}
                    {data.headers.map((header) => {
                      const cellVal = row[header] || '';
                      const isPhone = isPhoneColumn(header);
                      const isStatus = isStatusColumn(header);
                      const isPriority = isPriorityMobileColumn(header);

                      let phoneDiag = null;
                      if (isPhone && cellVal) {
                        phoneDiag = normalizePhoneWithDiagnostics(cellVal);
                      }

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
                          className={`${compactRows ? 'py-1.5' : 'py-2.5'} px-3 text-primary max-w-sm truncate text-xs ${
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
