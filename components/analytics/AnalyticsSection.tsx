'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  AnalyticsFilterProvider,
  useAnalyticsFilter,
} from '@/lib/analytics-filter-context';
import { GenderPieChart } from './GenderPieChart';
import { AgePyramidChart } from './AgePyramidChart';
import { CategoryBarChart } from './CategoryBarChart';
import { RegionHierarchyTable } from './RegionHierarchyTable';
import { RegionMap } from './RegionMap';
import { DataQualityCard } from './DataQualityCard';
import {
  BarChart3,
  Filter,
  RotateCcw,
  Download,
  Calendar,
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
  aggregateByRegionHierarchy,
  aggregateMonthlyDynamics,
  aggregateTopCrossCombinations,
} from '@/lib/analytics-aggregations';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useTheme } from '@/lib/theme-context';
import { DATA_PALETTE } from '@/lib/chart-colors';
import { exportRowsToCSV } from '@/lib/csv-utils';

interface AnalyticsPayload {
  rows?: AnalyticsRow[];
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

  // Separate BI date range filter (creationDate)
  const [biStartDate, setBiStartDate] = useState('');
  const [biEndDate, setBiEndDate] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/analytics')
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
  }, []);

  // Helper matching predicates
  const matchesRegion = (r: AnalyticsRow) => !selectedRegion || r.region === selectedRegion;
  const matchesDistrict = (r: AnalyticsRow) => !selectedDistrict || r.district === selectedDistrict;
  const matchesGender = (r: AnalyticsRow) => !selectedGender || r.gender === selectedGender;
  const matchesEducation = (r: AnalyticsRow) => !selectedEducation || r.education === selectedEducation;
  const matchesProfession = (r: AnalyticsRow) => !selectedProfession || r.profession === selectedProfession;
  const matchesAge = (r: AnalyticsRow) =>
    !selectedAgeBin || (r.age !== null && binAge(r.age) === selectedAgeBin);
  const matchesSource = (r: AnalyticsRow) => !selectedSource || r.source === selectedSource;
  const matchesBiDate = (r: AnalyticsRow) => {
    if (!r.creationDate) return true;
    if (biStartDate && r.creationDate < biStartDate) return false;
    if (biEndDate && r.creationDate > biEndDate) return false;
    return true;
  };

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
        matchesSource(r) &&
        matchesBiDate(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedEducation,
    selectedProfession,
    selectedAgeBin,
    selectedSource,
    biStartDate,
    biEndDate,
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
        matchesSource(r) &&
        matchesBiDate(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedProfession,
    selectedAgeBin,
    selectedSource,
    biStartDate,
    biEndDate,
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
        matchesSource(r) &&
        matchesBiDate(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedEducation,
    selectedAgeBin,
    selectedSource,
    biStartDate,
    biEndDate,
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
        matchesSource(r) &&
        matchesBiDate(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedEducation,
    selectedProfession,
    selectedSource,
    biStartDate,
    biEndDate,
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
        matchesAge(r) &&
        matchesBiDate(r)
    );
  }, [
    data?.rows,
    selectedRegion,
    selectedDistrict,
    selectedGender,
    selectedEducation,
    selectedProfession,
    selectedAgeBin,
    biStartDate,
    biEndDate,
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
        matchesSource(r) &&
        matchesBiDate(r)
    );
  }, [
    data?.rows,
    selectedGender,
    selectedEducation,
    selectedProfession,
    selectedAgeBin,
    selectedSource,
    biStartDate,
    biEndDate,
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
        matchesSource(r) &&
        matchesBiDate(r)
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
    biStartDate,
    biEndDate,
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
          dates: [biStartDate, biEndDate],
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
    biStartDate,
    biEndDate,
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

  const regionHierarchyData = useMemo(() => {
    if (!data?.rows) return data?.byRegionGender ?? null;
    return aggregateByRegionHierarchy(rowsForRegionTable);
  }, [data, rowsForRegionTable]);

  const reactiveMonthlyDynamics = useMemo(() => {
    if (!filteredRows.length) return [];
    return aggregateMonthlyDynamics(filteredRows);
  }, [filteredRows]);

  const reactiveTopPairs = useMemo(() => {
    if (!filteredRows.length) return [];
    return aggregateTopCrossCombinations(filteredRows, 8);
  }, [filteredRows]);

  // KPI for last 7 and 30 days (Item VII.8)
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

  // CSV Export (Item VII.10)
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

  const hasActiveFilters = Boolean(
    selectedRegion ||
      selectedDistrict ||
      selectedGender ||
      selectedEducation ||
      selectedProfession ||
      selectedAgeBin ||
      selectedSource ||
      biStartDate ||
      biEndDate
  );

  const axisTextColor = isDark ? '#7C8494' : '#6B7280';

  // Compare regions calculation (Item VII.7)
  const comparedRegionsData = useMemo(() => {
    if (!selectedCompareRegions.length || !data?.rows) return [];
    return selectedCompareRegions.map((regionName) => {
      const regRows = rowsForRegionTable.filter((r) => r.region === regionName);
      const male = regRows.filter((r) => r.gender === 'Мужской').length;
      const female = regRows.filter((r) => r.gender === 'Женский').length;
      const total = regRows.length;
      let ageSum = 0;
      let ageCount = 0;
      for (const r of regRows) {
        if (r.age && r.age > 0 && r.age < 120) {
          ageSum += r.age;
          ageCount++;
        }
      }
      const avgAge = ageCount > 0 ? (ageSum / ageCount).toFixed(1) : '—';
      return { regionName, total, male, female, avgAge };
    });
  }, [selectedCompareRegions, data?.rows, rowsForRegionTable]);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-primary">
              BI-аналитика базы респондентов (main_base)
            </h3>
          </div>
          <p className="text-[11px] text-secondary mt-0.5">
            Многомерный срез базы (<span className="tabular-nums font-medium text-primary">{data?.dataQuality?.totalRows?.toLocaleString() || '33 228'}</span> строк).
            Клик по секторам и барам изолированно фильтрует соседние виджеты.
          </p>
        </div>

        {/* Action controls: Date range + Export + Reset */}
        <div className="flex items-center flex-wrap gap-2">
          {/* BI Registration Date Range */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-[6px] px-2 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-secondary" />
            <input
              type="date"
              value={biStartDate}
              onChange={(e) => setBiStartDate(e.target.value)}
              className="bg-transparent text-primary text-[11px] border-none focus:outline-none"
              title="Начальная дата регистрации"
            />
            <span className="text-secondary text-[11px]">—</span>
            <input
              type="date"
              value={biEndDate}
              onChange={(e) => setBiEndDate(e.target.value)}
              className="bg-transparent text-primary text-[11px] border-none focus:outline-none"
              title="Конечная дата регистрации"
            />
            {(biStartDate || biEndDate) && (
              <button
                onClick={() => {
                  setBiStartDate('');
                  setBiEndDate('');
                }}
                className="text-secondary hover:text-primary text-[10px] ml-1"
                title="Сбросить даты"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={exportFilteredCSV}
            disabled={!filteredRows.length}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-surface hover:bg-surface-2 text-secondary hover:text-primary text-xs border border-border transition-colors cursor-pointer disabled:opacity-50"
            title="Экспорт текущего среза со всеми активными фильтрами"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Экспорт среза</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => {
                resetFilters();
                setBiStartDate('');
                setBiEndDate('');
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs border border-border transition-colors cursor-pointer"
              title="Сбросить все фильтры"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить</span>
            </button>
          )}
        </div>
      </div>

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

          {(biStartDate || biEndDate) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/15 text-primary text-[11px] border border-accent/25">
              Период: <strong>{biStartDate || '...'} — {biEndDate || '...'}</strong>
              <button onClick={() => { setBiStartDate(''); setBiEndDate(''); }} className="hover:text-accent font-bold ml-0.5">✕</button>
            </span>
          )}

          <span className="text-secondary text-[11px] ml-auto tabular-nums">
            В срезе: <strong className="text-primary font-semibold">{filteredRows.length.toLocaleString('ru-RU')}</strong> респондентов
          </span>
        </div>
      )}

      {/* KPI Cards: Dynamic Slice count + New registrations in 7/30 days (VII.8) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-surface border border-border rounded-[8px] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-secondary">Респондентов в срезе</div>
            <div className="text-lg font-semibold text-primary tabular-nums mt-0.5">
              {filteredRows.length.toLocaleString('ru-RU')}
            </div>
            <div className="text-[10px] text-secondary mt-0.5">
              {((filteredRows.length / (data?.dataQuality?.totalRows || 1)) * 100).toFixed(1)}% от всей базы
            </div>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-accent/10 flex items-center justify-center text-accent">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-surface border border-border rounded-[8px] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-secondary">Новых за 7 дней (срез)</div>
            <div className="text-lg font-semibold text-primary tabular-nums mt-0.5">
              {recentStats.last7.toLocaleString('ru-RU')}
            </div>
            <div className="text-[10px] text-secondary mt-0.5">
              По дате создания в main_base
            </div>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-surface border border-border rounded-[8px] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-secondary">Новых за 30 дней (срез)</div>
            <div className="text-lg font-semibold text-primary tabular-nums mt-0.5">
              {recentStats.last30.toLocaleString('ru-RU')}
            </div>
            <div className="text-[10px] text-secondary mt-0.5">
              Месячный прирост респондентов
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

      {/* Primary BI widgets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Gender pie: fed by isolated slice rowsForGenderChart */}
        <GenderPieChart genderCount={reactiveGenderCount} loading={loading} />

        {/* Age pyramid: fed by isolated slice rowsForAgeChart */}
        <AgePyramidChart
          ageBins={reactiveAgeBins}
          averageAge={reactiveAverageAge}
          loading={loading}
        />

        {/* Education bar: fed by isolated slice rowsForEducationChart */}
        <CategoryBarChart
          dataCounts={reactiveEducationCount}
          title="Уровень образования"
          filterType="education"
          loading={loading}
        />
      </div>

      {/* Second row: Profession bar + Source bar + Region hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Profession bar (Item VII.1): fed by isolated slice rowsForProfessionChart */}
        <CategoryBarChart
          dataCounts={reactiveProfessionCount}
          title="Сфера занятости"
          filterType="profession"
          limit={7}
          loading={loading}
        />

        {/* Source bar (Item VII.3): fed by isolated slice rowsForSourceChart */}
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

      {/* Region Hierarchy Table and Region Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <RegionHierarchyTable
            byRegionGender={regionHierarchyData}
            loading={loading}
          />
        </div>
        <RegionMap />
      </div>

      {/* Region Side-by-Side Comparison Card (Item VII.7) */}
      {comparedRegionsData.length > 0 && (
        <div className="bg-surface border border-border rounded-[8px] p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-semibold text-primary">
                Сравнение регионов бок о бок ({comparedRegionsData.length} из 3)
              </h4>
            </div>
            <span className="text-[10px] text-secondary">
              Выбрано чекбоксами в таблице иерархии
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {comparedRegionsData.map((reg) => (
              <div
                key={reg.regionName}
                className="p-3 bg-surface-2 border border-border rounded-[6px] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-primary">
                  <span className="truncate">{reg.regionName}</span>
                  <button
                    onClick={() => toggleCompareRegion(reg.regionName)}
                    className="text-secondary hover:text-primary text-[10px]"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-secondary">
                    <span>Всего респондентов:</span>
                    <strong className="text-primary tabular-nums">{reg.total.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Мужчины:</span>
                    <span style={{ color: DATA_PALETTE.data1 }} className="tabular-nums font-medium">
                      {reg.male.toLocaleString()} ({reg.total ? ((reg.male / reg.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Женщины:</span>
                    <span style={{ color: DATA_PALETTE.data2 }} className="tabular-nums font-medium">
                      {reg.female.toLocaleString()} ({reg.total ? ((reg.female / reg.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Ср. возраст:</span>
                    <strong className="text-primary tabular-nums">{reg.avgAge} лет</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom widgets: Monthly Dynamics (VII.4) and Top Cross-Combinations (VII.6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Monthly dynamics chart */}
        <div className="bg-surface border border-border rounded-[8px] p-3.5 flex flex-col justify-between h-72">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-primary">
              Динамика регистраций по месяцам (main_base)
            </h4>
            <span className="text-[10px] text-secondary">
              За всё время ({reactiveMonthlyDynamics.length} мес.)
            </span>
          </div>

          <div className="flex-1 w-full min-h-[190px]">
            {reactiveMonthlyDynamics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={reactiveMonthlyDynamics}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="monthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={DATA_PALETTE.data1} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={DATA_PALETTE.data1} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: axisTextColor, fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: axisTextColor, fontSize: 10 }} />
                  <Tooltip
                    formatter={(val) =>
                      val !== undefined && val !== null
                        ? Number(val).toLocaleString('ru-RU')
                        : '0'
                    }
                    contentStyle={{
                      backgroundColor: isDark ? '#12161F' : '#FFFFFF',
                      borderColor: isDark ? '#1E2430' : '#E7E5E0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: isDark ? '#E4E7EC' : '#1C1E21',
                      padding: '6px 10px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={DATA_PALETTE.data1}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#monthGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-secondary text-xs">
                Нет данных с датами в текущем срезе
              </div>
            )}
          </div>
        </div>

        {/* Top combinations: Sphere x Education */}
        <div className="bg-surface border border-border rounded-[8px] p-3.5 flex flex-col justify-between h-72">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-primary">
              Топ комбинаций: Сфера × Образование
            </h4>
            <span className="text-[10px] text-secondary">
              Топ 8 пар в срезе
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 text-xs">
            {reactiveTopPairs.length > 0 ? (
              reactiveTopPairs.map(({ pair, count }, idx) => (
                <div
                  key={pair}
                  className="flex items-center justify-between p-2 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 transition-colors text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-4 text-center text-secondary text-[10px] font-mono">
                      #{idx + 1}
                    </span>
                    <span className="text-primary truncate font-medium">{pair}</span>
                  </div>
                  <strong className="text-primary tabular-nums shrink-0">
                    {count.toLocaleString('ru-RU')}
                  </strong>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-secondary text-xs">
                Нет комбинаций для отображения
              </div>
            )}
          </div>
        </div>
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
