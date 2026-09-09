'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { Skeleton } from '@/components/ui/Skeleton';
import { DATA_PALETTE } from '@/lib/chart-colors';

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
    return <Skeleton className="h-80 rounded-[8px]" />;
  }

  if (!byRegionGender || Object.keys(byRegionGender).length === 0) {
    return (
      <div className="h-80 rounded-[8px] bg-surface border border-border flex items-center justify-center text-secondary text-xs">
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
    <div className="bg-surface border border-border rounded-[8px] p-3.5 flex flex-col h-80">
      <div className="flex items-center justify-between pb-2.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-secondary" />
          <h4 className="text-xs font-semibold text-primary">
            Иерархия: Регион ▸ Район / Город
          </h4>
        </div>
        {selectedRegion && (
          <button
            onClick={() => setSelectedRegion(null)}
            className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer"
          >
            Сброс ({selectedRegion}) ✕
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 mt-2 pr-1 space-y-0.5 text-xs">
        {sortedRegions.map(([region, regData]) => {
          const totalRegion = regData.Мужской + regData.Женский;
          const isExpanded = !!expandedRegions[region];
          const isSelected = selectedRegion === region;
          const districts = Object.entries(regData.district).sort(
            (a, b) => b[1].Мужской + b[1].Женский - (a[1].Мужской + a[1].Женский)
          );

          return (
            <div key={region} className="rounded-[6px] overflow-hidden">
              <div
                onClick={() => handleRegionClick(region)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-[6px] cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-accent/15 border-l-2 border-accent text-primary font-medium'
                    : 'hover:bg-surface-2 text-primary border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => toggleExpand(region, e)}
                    className="p-0.5 hover:bg-surface-2 rounded text-secondary"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  <span className="font-normal text-xs">{region}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px]">
                  <span style={{ color: DATA_PALETTE.data1 }} className="tabular-nums">
                    М: {regData.Мужской.toLocaleString()}
                  </span>
                  <span style={{ color: DATA_PALETTE.data2 }} className="tabular-nums">
                    Ж: {regData.Женский.toLocaleString()}
                  </span>
                  <strong className="text-primary bg-surface-2 px-1.5 py-0.5 rounded-[4px] border border-border tabular-nums">
                    {totalRegion.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Nested districts */}
              {isExpanded && (
                <div className="ml-5 my-0.5 space-y-0.5 border-l border-border pl-2">
                  {districts.map(([district, dData]) => {
                    const dTotal = dData.Мужской + dData.Женский;
                    return (
                      <div
                        key={district}
                        className="flex items-center justify-between py-1 px-2 rounded-[4px] text-secondary hover:text-primary hover:bg-surface-2/60 text-[11px]"
                      >
                        <span className="truncate max-w-xs">{district}</span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span style={{ color: DATA_PALETTE.data1 }} className="tabular-nums">{dData.Мужской}</span>
                          <span style={{ color: DATA_PALETTE.data2 }} className="tabular-nums">{dData.Женский}</span>
                          <span className="text-primary font-medium tabular-nums">{dTotal}</span>
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
