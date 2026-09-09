'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { Skeleton } from '@/components/ui/Skeleton';

interface RegionData {
  Мужской: number;
  Женский: number;
  district: Record<string, { Мужской: number; Женский: number }>;
}

interface Props {
  byRegionGender: Record<string, RegionData> | null;
  loading: boolean;
}

export const RegionHierarchyTable: React.FC<Props> = ({ byRegionGender, loading }) => {
  const { selectedRegion, setSelectedRegion } = useAnalyticsFilter();
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  if (!byRegionGender || Object.keys(byRegionGender).length === 0) {
    return (
      <div className="h-96 rounded-2xl bg-surface border border-border flex items-center justify-center text-secondary text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const toggleExpand = (region: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRegions((prev) => ({ ...prev, [region]: !prev[region] }));
  };

  const handleRegionClick = (region: string) => {
    if (selectedRegion === region) {
      setSelectedRegion(null);
    } else {
      setSelectedRegion(region);
    }
  };

  const sortedRegions = Object.entries(byRegionGender).sort((a, b) => {
    const totalA = a[1].Мужской + a[1].Женский;
    const totalB = b[1].Мужской + b[1].Женский;
    return totalB - totalA;
  });

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col h-96 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" />
          <h4 className="text-xs font-bold text-primary tracking-wider uppercase">
            Иерархия: Регион ▸ Район / Город
          </h4>
        </div>
        {selectedRegion && (
          <button
            onClick={() => setSelectedRegion(null)}
            className="text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer"
          >
            Сброс фильтра ({selectedRegion}) ✕
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 mt-2 pr-1 space-y-1 scrollbar-thin text-xs">
        {sortedRegions.map(([region, regData]) => {
          const totalRegion = regData.Мужской + regData.Женский;
          const isExpanded = !!expandedRegions[region];
          const isSelected = selectedRegion === region;
          const districts = Object.entries(regData.district).sort(
            (a, b) => b[1].Мужской + b[1].Женский - (a[1].Мужской + a[1].Женский)
          );

          return (
            <div key={region} className="rounded-xl overflow-hidden">
              <div
                onClick={() => handleRegionClick(region)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-accent/15 border border-accent/40 text-primary font-medium'
                    : 'bg-surface-2/60 hover:bg-surface-2 text-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => toggleExpand(region, e)}
                    className="p-1 hover:bg-surface-2 rounded transition-colors text-secondary"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="font-semibold">{region}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-blue-500">М: {regData.Мужской.toLocaleString()}</span>
                  <span className="text-pink-500">Ж: {regData.Женский.toLocaleString()}</span>
                  <strong className="text-primary bg-surface px-2 py-0.5 rounded border border-border">
                    {totalRegion.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Nested districts */}
              {isExpanded && (
                <div className="ml-6 my-1 space-y-1 border-l-2 border-border pl-2">
                  {districts.map(([district, dData]) => {
                    const dTotal = dData.Мужской + dData.Женский;
                    return (
                      <div
                        key={district}
                        className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-surface-2/40 text-secondary hover:text-primary"
                      >
                        <span className="truncate max-w-xs">{district}</span>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="text-blue-500/80">{dData.Мужской}</span>
                          <span className="text-pink-500/80">{dData.Женский}</span>
                          <span className="text-primary font-semibold">{dTotal}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
