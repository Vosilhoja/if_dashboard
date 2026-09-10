'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  AnalyticsFilterProvider,
  useAnalyticsFilter,
} from '@/lib/analytics-filter-context';
import { GenderPieChart } from './GenderPieChart';
import { AgePyramidChart } from './AgePyramidChart';
import { CategoryBarChart } from './CategoryBarChart';
import { DataQualityCard } from './DataQualityCard';
import {
  BarChart3,
  Filter,
  RotateCcw,
  Download,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { binAge, AgeBin } from '@/lib/age-utils';
import {
  AnalyticsRow,
  aggregateByGender,
  aggregateByAge,
  aggregateByCategory,
} from '@/lib/analytics-aggregations';
import { DateFilter } from '@/components/DateFilter';
import { useTheme } from '@/lib/theme-context';
import { DATA_PALETTE } from '@/lib/chart-colors';
import { exportRowsToCSV, exportRowsToExcel } from '@/lib/csv-utils';

interface AnalyticsPayload {
  rows?: AnalyticsRow[];
  allRowsCount?: number;
  periodRowsCount?: number;
  rolling7DaysCount?: number;
  rolling30DaysCount?: number;
  byRegionGender: Record<
    string,
    {
      Мужской: number;
      Женский: number;
      district: Record<string, { Мужской: number; Женский: number }>;
    }
  >;
  genderCount: { Мужской: number; Женский: number };
  educationCount: Record<string, number>;
  professionCount?: Record<string, number>;
  sourceCount: Record<string, number>;
  ageBins: Record<AgeBin, { Мужской: number; Женский: number }>;
  averageAge: number | null;
  monthlyDynamics?: Array<{ month: string; count: number }>;
  topPairs?: Array<{ pair: string; count: number }>;
  dataQuality: {
    emptyPhone: number;
    emptyRegion: number;
    emptyAge: number;
    emptyEducation: number;
    emptyProfession: number;
    totalRows: number;
  };
  cachedAt: string;
}

function AnalyticsDashboardContent() {
  const {
    startDate,
    endDate,
    filterMode,
    currentDate,
    weekStartsOn,
    setFilterMode,
    setCurrentDate,
    setDateRange,
    selectedRegion,
    setSelectedRegion,
    selectedDistrict,
    setSelectedDistrict,
    selectedGender,
    setSelectedGender,
    selectedEducation,
    setSelectedEducation,
    selectedProfession,
    setSelectedProfession,
    selectedAgeBin,
    setSelectedAgeBin,
    selectedSource,
    setSelectedSource,
    selectedCompareRegions,
    toggleCompareRegion,
    resetFilters,
  } = useAnalyticsFilter();

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    // When filterMode is 'alltime', don't send date params
    if (filterMode !== 'alltime') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }

    fetch(`/api/proxy/data/analytics?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: AnalyticsPayload) => {
        setData(json);
      })
      .catch((err) => {
        setError(err.message || 'Ошибка загрузки аналитики');
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate, filterMode]);

  // Helper matching predicates
  const matchesRegion = (r: AnalyticsRow) => !selectedRegion || r.region === selectedRegion;
  const matchesDistrict = (r: AnalyticsRow) => !selectedDistrict || r.district === selectedDistrict;
  const matchesGender = (r: AnalyticsRow) => !selectedGender || r.gender === selectedGender;
  const matchesEducation = (r: AnalyticsRow) => !selectedEducation || r.education === selectedEducation;
  const matchesProfession = (r: AnalyticsRow) => !selectedProfession || r.profession === selectedProfession;
  const matchesAge = (r: AnalyticsRow) =>
    !selectedAgeBin || (r.age !== null && binAge(r.age) === selectedAgeBin);
  const matchesSource = (r: AnalyticsRow) => !selectedSource || r.source === selectedSource;
  // 1. Slice WITHOUT gender filter (for GenderPieChart)
  const rowsForGenderChart = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) =>
        matchesRegion(r) &&
        matchesDistrict(r) &&
        matchesEducation(r) &&
        matchesProfession(r) &&
        matchesAge(r) &&
        matchesSource(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedEducation,
    selectedProfession,
    selectedAgeBin,
    selectedSource,
  ]);

  // 2. Slice WITHOUT education filter (for Education CategoryBarChart)
  const rowsForEducationChart = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) =>
        matchesRegion(r) &&
        matchesDistrict(r) &&
        matchesGender(r) &&
        matchesProfession(r) &&
        matchesAge(r) &&
        matchesSource(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedProfession,
    selectedAgeBin,
    selectedSource,
  ]);

  // 3. Slice WITHOUT profession filter (for Profession CategoryBarChart)
  const rowsForProfessionChart = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) =>
        matchesRegion(r) &&
        matchesDistrict(r) &&
        matchesGender(r) &&
        matchesEducation(r) &&
        matchesAge(r) &&
        matchesSource(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedEducation,
    selectedAgeBin,
    selectedSource,
  ]);

  // 4. Slice WITHOUT age filter (for AgePyramidChart)
  const rowsForAgeChart = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) =>
        matchesRegion(r) &&
        matchesDistrict(r) &&
        matchesGender(r) &&
        matchesEducation(r) &&
        matchesProfession(r) &&
        matchesSource(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedEducation,
    selectedProfession,
    selectedSource,
  ]);

  // 5. Slice WITHOUT source filter (for Source CategoryBarChart)
  const rowsForSourceChart = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) =>
        matchesRegion(r) &&
        matchesDistrict(r) &&
        matchesGender(r) &&
        matchesEducation(r) &&
        matchesProfession(r) &&
        matchesAge(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedEducation,
    selectedProfession,
    selectedAgeBin,
  ]);

  // 6. Slice for Region Table (cross-filtered by non-region dimensions)
  const rowsForRegionTable = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) =>
        matchesGender(r) &&
        matchesEducation(r) &&
        matchesProfession(r) &&
        matchesAge(r) &&
        matchesSource(r)
    );
  }, [
    data?.rows,
    selectedGender,
    selectedEducation,
    selectedProfession,
    selectedAgeBin,
    selectedSource,
  ]);

  // 7. Full slice (ALL filters combined) — for CSV, counts, KPI, Dynamics, TopPairs
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) =>
        matchesRegion(r) &&
        matchesDistrict(r) &&
        matchesGender(r) &&
        matchesEducation(r) &&
        matchesProfession(r) &&
        matchesAge(r) &&
        matchesSource(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedEducation,
    selectedProfession,
    selectedAgeBin,
    selectedSource,
  ]);

  // Step III: Debug log for verifying AND logic and isolated slices
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[BI Cross-Filter Verification]', {
        active: {
          region: selectedRegion,
          district: selectedDistrict,
          gender: selectedGender,
          education: selectedEducation,
          profession: selectedProfession,
          ageBin: selectedAgeBin,
          source: selectedSource,
          dates: [startDate, endDate],
        },
        counts: {
          total: data?.rows?.length || 0,
          filteredRows: filteredRows.length,
          genderSlice: rowsForGenderChart.length,
          educationSlice: rowsForEducationChart.length,
          professionSlice: rowsForProfessionChart.length,
          ageSlice: rowsForAgeChart.length,
          sourceSlice: rowsForSourceChart.length,
        },
      });
    }
  }, [
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedEducation,
    selectedProfession,
    selectedAgeBin,
    selectedSource,
    startDate,
    endDate,
    data?.rows?.length,
    filteredRows.length,
    rowsForGenderChart.length,
    rowsForEducationChart.length,
    rowsForProfessionChart.length,
    rowsForAgeChart.length,
    rowsForSourceChart.length,
  ]);

  // Aggregated data for each component
  const reactiveGenderCount = useMemo(() => {
    if (!data?.rows) return data?.genderCount ?? null;
    return aggregateByGender(rowsForGenderChart);
  }, [data, rowsForGenderChart]);

  const { reactiveAgeBins, reactiveAverageAge } = useMemo(() => {
    if (!data?.rows) {
      return {
        reactiveAgeBins: data?.ageBins ?? null,
        reactiveAverageAge: data?.averageAge ?? null,
      };
    }
    const { bins, averageAge } = aggregateByAge(rowsForAgeChart);
    return { reactiveAgeBins: bins, reactiveAverageAge: averageAge };
  }, [data, rowsForAgeChart]);

  const reactiveEducationCount = useMemo(() => {
    if (!data?.rows) return data?.educationCount ?? null;
    return aggregateByCategory(rowsForEducationChart, 'education');
  }, [data, rowsForEducationChart]);

  const reactiveProfessionCount = useMemo(() => {
    if (!data?.rows) return data?.professionCount ?? null;
    return aggregateByCategory(rowsForProfessionChart, 'profession');
  }, [data, rowsForProfessionChart]);

  const reactiveSourceCount = useMemo(() => {
    if (!data?.rows) return data?.sourceCount ?? null;
    return aggregateByCategory(rowsForSourceChart, 'source');
  }, [data, rowsForSourceChart]);

  // KPI for last 7 and 30 days
  const recentStats = useMemo(() => {
    if (!filteredRows.length) return { last7: 0, last30: 0 };
    let latestDateStr = '';
    for (const r of filteredRows) {
      if (r.creationDate && r.creationDate > latestDateStr) {
        latestDateStr = r.creationDate;
      }
    }
    const refDate = latestDateStr ? new Date(latestDateStr) : new Date();

    const t7 = new Date(refDate);
    t7.setDate(t7.getDate() - 7);
    const t7Str = t7.toISOString().slice(0, 10);

    const t30 = new Date(refDate);
    t30.setDate(t30.getDate() - 30);
    const t30Str = t30.toISOString().slice(0, 10);

    let last7 = 0;
    let last30 = 0;
    for (const r of filteredRows) {
      if (r.creationDate) {
        if (r.creationDate >= t7Str) last7++;
        if (r.creationDate >= t30Str) last30++;
      }
    }
    return { last7, last30 };
  }, [filteredRows]);

  // CSV & Excel Export
  const exportFilteredCSV = () => {
    if (!filteredRows || filteredRows.length === 0) return;
    const headers = [
      { key: 'region', label: 'Регион' },
      { key: 'district', label: 'Район' },
      { key: 'gender', label: 'Пол' },
      { key: 'age', label: 'Возраст' },
      { key: 'education', label: 'Образование' },
      { key: 'profession', label: 'Сфера занятости' },
      { key: 'source', label: 'Источник' },
      { key: 'creationDate', label: 'Дата создания' },
    ];
    const filename = `bi_analytics_slice_${new Date().toISOString().slice(0, 10)}.csv`;
    exportRowsToCSV(filteredRows, headers, filename);
  };

  const exportFilteredExcel = () => {
    if (!filteredRows || filteredRows.length === 0) return;
    const headers = [
      { key: 'region', label: 'Регион' },
      { key: 'district', label: 'Район' },
      { key: 'gender', label: 'Пол' },
      { key: 'age', label: 'Возраст' },
      { key: 'education', label: 'Образование' },
      { key: 'profession', label: 'Сфера занятости' },
      { key: 'source', label: 'Источник' },
      { key: 'creationDate', label: 'Дата создания' },
    ];
    const filename = `bi_analytics_slice_${new Date().toISOString().slice(0, 10)}`;
    exportRowsToExcel(filteredRows, headers, filename);
  };

  const hasActiveFilters = Boolean(
    selectedRegion ||
      selectedDistrict ||
      selectedGender ||
      selectedEducation ||
      selectedProfession ||
      selectedAgeBin ||
      selectedSource
  );

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight truncate">
              BI-аналитика респондентов
            </h3>
          </div>
          <p className="text-xs text-secondary mt-1 line-clamp-2 sm:line-clamp-1">
            Срез базы (<span className="tabular-nums font-semibold text-primary">{data?.dataQuality?.totalRows?.toLocaleString() || '—'}</span> строк). Клик по секторам фильтрует соседние виджеты.
          </p>
        </div>

        {/* Action controls: Export + Reset */}
        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={exportFilteredExcel}
            disabled={!filteredRows.length}
            className="active-press flex items-center gap-1.5 px-3 h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Экспорт текущего среза в Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            onClick={exportFilteredCSV}
            disabled={!filteredRows.length}
            className="active-press flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs font-semibold border border-border transition-colors cursor-pointer disabled:opacity-50"
            title="Экспорт текущего среза в CSV"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>CSV</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="active-press flex items-center gap-1 px-3 h-9 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/30 transition-colors cursor-pointer"
              title="Сбросить все срезы"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить</span>
            </button>
          )}
        </div>
      </div>

      {/* DateFilter unified component */}
      <DateFilter
        mode={filterMode}
        onModeChange={setFilterMode}
        currentDate={currentDate}
        onCurrentDateChange={setCurrentDate}
        startDate={startDate}
        endDate={endDate}
        onCustomRangeChange={(s, e) => setDateRange(s, e)}
        weekStartsOn={weekStartsOn}
      />

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-1.5 p-2 rounded-[6px] bg-surface-2/70 border border-border text-xs">
          <div className="flex items-center gap-1 text-secondary font-medium mr-1 text-[11px]">
            <Filter className="w-3 h-3 text-accent" />
            <span>Активные фильтры:</span>
          </div>

          {selectedRegion && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/15 text-primary text-[11px] border border-accent/25">
              Регион: <strong>{selectedRegion}</strong>
              <button onClick={() => { setSelectedRegion(null); setSelectedDistrict(null); }} className="hover:text-accent font-bold ml-0.5">✕</button>
            </span>
          )}

          {selectedDistrict && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/15 text-primary text-[11px] border border-accent/25">
              Район: <strong>{selectedDistrict}</strong>
              <button onClick={() => setSelectedDistrict(null)} className="hover:text-accent font-bold ml-0.5">✕</button>
            </span>
          )}

          {selectedGender && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/15 text-primary text-[11px] border border-accent/25">
              Пол: <strong>{selectedGender}</strong>
              <button onClick={() => setSelectedGender(null)} className="hover:text-accent font-bold ml-0.5">✕</button>
            </span>
          )}

          {selectedEducation && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/15 text-primary text-[11px] border border-accent/25">
              Образование: <strong>{selectedEducation}</strong>
              <button onClick={() => setSelectedEducation(null)} className="hover:text-accent font-bold ml-0.5">✕</button>
            </span>
          )}

          {selectedProfession && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/15 text-primary text-[11px] border border-accent/25">
              Сфера: <strong>{selectedProfession}</strong>
              <button onClick={() => setSelectedProfession(null)} className="hover:text-accent font-bold ml-0.5">✕</button>
            </span>
          )}

          {selectedAgeBin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/15 text-primary text-[11px] border border-accent/25">
              Возраст: <strong>{selectedAgeBin}</strong>
              <button onClick={() => setSelectedAgeBin(null)} className="hover:text-accent font-bold ml-0.5">✕</button>
            </span>
          )}

          {selectedSource && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/15 text-primary text-[11px] border border-accent/25">
              Источник: <strong>{selectedSource}</strong>
              <button onClick={() => setSelectedSource(null)} className="hover:text-accent font-bold ml-0.5">✕</button>
            </span>
          )}

          <span className="text-secondary text-[11px] ml-auto tabular-nums">
            В срезе: <strong className="text-primary font-semibold">{filteredRows.length.toLocaleString('ru-RU')}</strong> респондентов
          </span>
        </div>
      )}

      {/* KPI Cards: Period Count + Rolling 7/30 days */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-surface border border-border rounded-[8px] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-secondary">Респондентов за период</div>
            <div className="text-lg font-semibold text-primary tabular-nums mt-0.5">
              {filteredRows.length.toLocaleString('ru-RU')}
            </div>
            <div className="text-[10px] text-secondary mt-0.5">
              {((filteredRows.length / (data?.dataQuality?.totalRows || 1)) * 100).toFixed(1)}% от всей базы ({data?.dataQuality?.totalRows?.toLocaleString('ru-RU')})
            </div>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-accent/10 flex items-center justify-center text-accent">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-surface border border-border rounded-[8px] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-secondary">Новых за 7 дней (от сегодня)</div>
            <div className="text-lg font-semibold text-primary tabular-nums mt-0.5">
              {(data?.rolling7DaysCount ?? recentStats.last7).toLocaleString('ru-RU')}
            </div>
            <div className="text-[10px] text-secondary mt-0.5">
              Скользящее окно 7 дней от сегодня
            </div>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-surface border border-border rounded-[8px] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-secondary">Новых за 30 дней (от сегодня)</div>
            <div className="text-lg font-semibold text-primary tabular-nums mt-0.5">
              {(data?.rolling30DaysCount ?? recentStats.last30).toLocaleString('ru-RU')}
            </div>
            <div className="text-[10px] text-secondary mt-0.5">
              Скользящее окно 30 дней от сегодня
            </div>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-sky-500/10 flex items-center justify-center text-sky-500">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
          Ошибка загрузки аналитических данных: {error}
        </div>
      )}

      {/* Primary BI widgets grid — Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Gender pie */}
        <GenderPieChart genderCount={reactiveGenderCount} loading={loading} />

        {/* Age pyramid */}
        <AgePyramidChart
          ageBins={reactiveAgeBins}
          averageAge={reactiveAverageAge}
          loading={loading}
        />

        {/* Education bar */}
        <CategoryBarChart
          dataCounts={reactiveEducationCount}
          title="Уровень образования"
          filterType="education"
          loading={loading}
        />
      </div>

      {/* Row 2: Profession bar + Source bar + DataQuality */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Profession bar */}
        <CategoryBarChart
          dataCounts={reactiveProfessionCount}
          title="Сфера занятости"
          filterType="profession"
          limit={7}
          loading={loading}
        />

        {/* Source bar */}
        <CategoryBarChart
          dataCounts={reactiveSourceCount}
          title="Откуда пришёл пользователь"
          filterType="source"
          limit={7}
          loading={loading}
        />

        {/* Data quality audit */}
        <DataQualityCard
          quality={data?.dataQuality ?? null}
          loading={loading}
        />
      </div>
    </div>
  );
}

export const AnalyticsSection: React.FC = () => {
  return (
    <AnalyticsFilterProvider>
      <AnalyticsDashboardContent />
    </AnalyticsFilterProvider>
  );
};
