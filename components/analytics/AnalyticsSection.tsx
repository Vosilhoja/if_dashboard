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
import { BarChart3, Filter } from 'lucide-react';
import { AgeBin } from '@/lib/age-utils';

interface AnalyticsPayload {
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
  const { selectedRegion } = useAnalyticsFilter();
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

  // Filter gender count if region selected via useMemo
  const filteredGenderCount = useMemo(() => {
    if (!data) return null;
    if (!selectedRegion) return data.genderCount;
    const reg = data.byRegionGender[selectedRegion];
    if (!reg) return { Мужской: 0, Женский: 0 };
    return { Мужской: reg.Мужской, Женский: reg.Женский };
  }, [data, selectedRegion]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              BI-аналитика панели пользователей (main_base)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Демографический профиль, образование, источники и качество базы данных (33 228 строк)
          </p>
        </div>

        {selectedRegion && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs">
            <Filter className="w-3.5 h-3.5" />
            <span>Фильтр по региону: <strong>{selectedRegion}</strong></span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          Ошибка загрузки аналитических данных: {error}
        </div>
      )}

      {/* Grid of BI widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <GenderPieChart genderCount={filteredGenderCount} loading={loading} />
        <AgePyramidChart
          ageBins={data?.ageBins ?? null}
          averageAge={data?.averageAge ?? null}
          loading={loading}
        />
        <CategoryBarChart
          dataCounts={data?.educationCount ?? null}
          title="Уровень образования"
          barColor="#a855f7"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RegionHierarchyTable
            byRegionGender={data?.byRegionGender ?? null}
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
          dataCounts={data?.sourceCount ?? null}
          title="Откуда пришёл пользователь"
          barColor="#06b6d4"
          limit={10}
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
