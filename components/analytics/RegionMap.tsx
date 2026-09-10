'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { MapPin, ExternalLink, X } from 'lucide-react';
import { UzbekistanMap } from '@/components/map/UzbekistanMap';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { AnalyticsRow } from '@/lib/analytics-aggregations';
import { normalizeRegionName } from '@/lib/region-name-map';
import { Skeleton } from '@/components/ui/Skeleton';

interface RegionMapProps {
  rows?: AnalyticsRow[];
  loading?: boolean;
}

export const RegionMap: React.FC<RegionMapProps> = ({ rows = [], loading = false }) => {
  const { selectedRegion, setSelectedRegion, setSelectedDistrict } = useAnalyticsFilter();

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.region) {
        const c = normalizeRegionName(r.region);
        counts[c] = (counts[c] || 0) + 1;
      }
    }
    return counts;
  }, [rows]);

  if (loading) {
    return <Skeleton className="h-80 rounded-[8px]" />;
  }

  const handleSelect = (ruName: string) => {
    if (!ruName) {
      setSelectedRegion(null);
      setSelectedDistrict(null);
      return;
    }
    const canonical = normalizeRegionName(ruName);
    if (selectedRegion && normalizeRegionName(selectedRegion) === canonical) {
      setSelectedRegion(null);
      setSelectedDistrict(null);
    } else {
      setSelectedRegion(canonical);
      setSelectedDistrict(null);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-[8px] p-3 flex flex-col justify-between h-80 overflow-hidden shadow-xs">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-accent" />
          <h4 className="text-xs font-semibold text-primary">Карта регионов</h4>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedRegion && (
            <button
              onClick={() => setSelectedRegion(null)}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[4px] bg-accent/10 text-accent border border-accent/25 hover:bg-accent/20 transition-colors cursor-pointer"
              title="Сбросить выбранный регион"
            >
              <span>{selectedRegion}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          <Link
            href="/map"
            className="flex items-center gap-1 text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer"
            title="Открыть полноэкранную карту с детализацией по районам"
          >
            <span className="hidden sm:inline">Полная карта</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Embedded interactive map */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden py-1">
        <UzbekistanMap
          regionCounts={regionCounts}
          totalRespondents={rows.length}
          selectedRegion={selectedRegion}
          onSelectRegion={handleSelect}
          onDeselect={() => setSelectedRegion(null)}
        />
      </div>
    </div>
  );
};
