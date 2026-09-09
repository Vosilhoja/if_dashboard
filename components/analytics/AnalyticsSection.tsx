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
import { BarChart3, Filter, RotateCcw } from 'lucide-react';
import { AgeBin } from '@/lib/age-utils';
import {
  AnalyticsRow,
  aggregateByGender,
  aggregateByAge,
  aggregateByCategory,
  aggregateByRegionHierarchy,
} from '@/lib/analytics-aggregations';

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
  sourceCount: Record<string, number>;
  ageBins: Record<AgeBin, { Мужской: number; Женский: number }>;
  averageAge: number | null;
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
    selectedGender,
    selectedEducation,
    resetFilters,
  } = useAnalyticsFilter();

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Filter rows reactively on client using Variant A
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    let result = data.rows;

    if (selectedRegion) {
      result = result.filter((r) => r.region === selectedRegion);
    }
    if (selectedGender) {
      result = result.filter((r) => r.gender === selectedGender);
    }
    if (selectedEducation) {
      result = result.filter((r) => r.education === selectedEducation);
    }

    return result;
  }, [data?.rows, selectedRegion, selectedGender, selectedEducation]);

  // Compute reactive slice metrics
  const reactiveGenderCount = useMemo(() => {
    if (!data?.rows) return data?.genderCount ?? null;
    return aggregateByGender(filteredRows);
  }, [data, filteredRows]);

  const { reactiveAgeBins, reactiveAverageAge } = useMemo(() => {
    if (!data?.rows) {
      return {
        reactiveAgeBins: data?.ageBins ?? null,
        reactiveAverageAge: data?.averageAge ?? null,
      };
    }
    const { bins, averageAge } = aggregateByAge(filteredRows);
    return { reactiveAgeBins: bins, reactiveAverageAge: averageAge };
  }, [data, filteredRows]);

  const reactiveEducationCount = useMemo(() => {
    if (!data?.rows) return data?.educationCount ?? null;
    return aggregateByCategory(filteredRows, 'education');
  }, [data, filteredRows]);

  const reactiveSourceCount = useMemo(() => {
    if (!data?.rows) return data?.sourceCount ?? null;
    return aggregateByCategory(filteredRows, 'source');
  }, [data, filteredRows]);

  // Region hierarchy can either show global or region slice
  const regionHierarchyData = useMemo(() => {
    if (!data?.rows) return data?.byRegionGender ?? null;
    if (!selectedGender && !selectedEducation) return data.byRegionGender;
    return aggregateByRegionHierarchy(filteredRows);
  }, [data, filteredRows, selectedGender, selectedEducation]);

  const hasActiveFilters = Boolean(selectedRegion || selectedGender || selectedEducation);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h3 className="text-base font-bold text-primary tracking-wide">
              BI-аналитика панели пользователей (main_base)
            </h3>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            Демографический профиль, образование, источники и качество базы данных ({data?.dataQuality?.totalRows?.toLocaleString() || '33 228'} строк)
          </p>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs">
              <Filter className="w-3.5 h-3.5" />
              <span>
                Фильтры:
                {selectedRegion && <strong> {selectedRegion}</strong>}
                {selectedGender && <strong> • {selectedGender}</strong>}
                {selectedEducation && <strong> • {selectedEducation}</strong>}
              </span>
              <span className="ml-1 text-secondary">
                ({filteredRows.length.toLocaleString()} чел.)
              </span>
            </div>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs border border-border transition-colors cursor-pointer"
              title="Сбросить все фильтры"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
          Ошибка загрузки аналитических данных: {error}
        </div>
      )}

      {/* Grid of BI widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <GenderPieChart genderCount={reactiveGenderCount} loading={loading} />
        <AgePyramidChart
          ageBins={reactiveAgeBins}
          averageAge={reactiveAverageAge}
          loading={loading}
        />
        <CategoryBarChart
          dataCounts={reactiveEducationCount}
          title="Уровень образования"
          barColor="#a855f7"
          filterType="education"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RegionHierarchyTable
            byRegionGender={regionHierarchyData}
            loading={loading}
          />
        </div>
        <DataQualityCard
          quality={data?.dataQuality ?? null}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <CategoryBarChart
          dataCounts={reactiveSourceCount}
          title="Откуда пришёл пользователь"
          barColor="#06b6d4"
          limit={10}
          filterType="source"
          loading={loading}
        />
        <RegionMap />
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
