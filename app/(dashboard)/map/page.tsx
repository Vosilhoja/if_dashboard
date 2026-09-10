'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UzbekistanMap } from '@/components/map/UzbekistanMap';
import { RegionDetailPanel } from '@/components/map/RegionDetailPanel';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { AnalyticsRow } from '@/lib/analytics-aggregations';
import { normalizeRegionName, REGION_RU_TO_EN } from '@/lib/region-name-map';
import {
  Map as MapIcon,
  Filter,
  X,
  ExternalLink,
  Users,
  Building2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export default function MapPage() {
  const {
    selectedRegion,
    setSelectedRegion,
    selectedDistrict,
    setSelectedDistrict,
  } = useAnalyticsFilter();

  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadAnalyticsData() {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.rows) {
          setRows(data.rows);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные карты');
      } finally {
        setLoading(false);
      }
    }

    loadAnalyticsData();
  }, []);

  // Compute aggregated count per canonical region
  const regionCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.region) {
        const canonical = normalizeRegionName(r.region);
        counts[canonical] = (counts[canonical] || 0) + 1;
      }
    }
    return counts;
  }, [rows]);

  // Open panel whenever a region is selected
  useEffect(() => {
    if (selectedRegion) {
      setIsPanelOpen(true);
    }
  }, [selectedRegion]);

  const handleSelectRegion = (regionName: string) => {
    const canonical = normalizeRegionName(regionName);
    if (selectedRegion && normalizeRegionName(selectedRegion) === canonical) {
      // Toggle or keep open
      setIsPanelOpen(true);
    } else {
      setSelectedRegion(canonical);
      setSelectedDistrict(null);
      setIsPanelOpen(true);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Note: keep selectedRegion in context so if user goes to /analytics it stays,
    // but user can also explicitly click "Сбросить выбор" in top bar
  };

  const handleClearSelection = () => {
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setIsPanelOpen(false);
  };

  const totalRespondents = rows.length;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-[8px] border border-border/80">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-accent" />
            <h1 className="text-base font-bold text-primary tracking-tight">
              Интерактивная карта регионов Узбекистана
            </h1>
          </div>
          <p className="text-xs text-secondary">
            Географическое распределение {totalRespondents.toLocaleString('ru-RU')} респондентов базы main_base
          </p>
        </div>

        {/* Selected Filter indicator & Quick Switcher */}
        <div className="flex items-center flex-wrap gap-2">
          {selectedRegion ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-accent/10 border border-accent/30 text-xs font-medium text-accent">
              <span>Регион: {selectedRegion}</span>
              <button
                onClick={handleClearSelection}
                className="hover:opacity-75 cursor-pointer ml-1"
                title="Сбросить выбранный регион"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-secondary hidden md:inline">
              Выберите область на карте для детализации
            </span>
          )}

          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs font-medium border border-border transition-colors cursor-pointer"
          >
            <span>Перейти в BI-аналитику</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Map Main Canvas */}
      <div className="relative">
        <UzbekistanMap
          regionCounts={regionCounts}
          totalRespondents={totalRespondents}
          selectedRegion={selectedRegion}
          onSelectRegion={handleSelectRegion}
        />

        {/* Detail Panel */}
        <RegionDetailPanel
          regionName={selectedRegion}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
          rows={rows}
          totalCountryRows={totalRespondents}
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
        />
      </div>

      {/* Summary table of 14 regions below map */}
      <div className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Сводка по всем 14 областям
          </h2>
          <span className="text-xs text-secondary">
            Нажмите на строку для выбора региона
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
          {Object.entries(REGION_RU_TO_EN).map(([ruName, enName]) => {
            const count = regionCounts[ruName] || 0;
            const percent =
              totalRespondents > 0
                ? `${((count / totalRespondents) * 100).toFixed(1)}%`
                : '0%';
            const isSelected =
              selectedRegion &&
              normalizeRegionName(selectedRegion) === normalizeRegionName(ruName);

            return (
              <button
                key={ruName}
                onClick={() => handleSelectRegion(ruName)}
                className={`p-2.5 rounded-[6px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-accent bg-accent/10 text-primary shadow-xs'
                    : 'border-border/60 bg-neutral-50 dark:bg-surface-2/60 hover:border-border hover:bg-surface-2'
                }`}
              >
                <div className="font-medium truncate text-primary">
                  {ruName.replace(' область', '').replace('г. ', '')}
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-secondary">
                  <span className="font-bold tabular-nums text-primary">
                    {count.toLocaleString('ru-RU')}
                  </span>
                  <span>{percent}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
