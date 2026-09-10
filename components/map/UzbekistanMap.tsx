'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { REGION_EN_TO_RU, normalizeRegionName } from '@/lib/region-name-map';
import { DATA_PALETTE } from '@/lib/chart-colors';

interface GeoFeature {
  type: string;
  properties: {
    shapeName: string;
    [key: string]: unknown;
  };
  geometry: any;
}

interface GeoJSONData {
  type: string;
  features: GeoFeature[];
}

interface UzbekistanMapProps {
  regionCounts: Record<string, number>;
  totalRespondents: number;
  selectedRegion: string | null;
  onSelectRegion: (ruName: string) => void;
}

export const UzbekistanMap: React.FC<UzbekistanMapProps> = ({
  regionCounts,
  totalRespondents,
  selectedRegion,
  onSelectRegion,
}) => {
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<{
    ruName: string;
    enName: string;
    count: number;
    percent: string;
    x: number;
    y: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/geo/uzbekistan-regions.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GeoJSONData) => {
        setGeoData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Uzbekistan GeoJSON:', err);
        setLoading(false);
      });
  }, []);

  const width = 960;
  const height = 580;

  // D3 Mercator projection fit to Uzbekistan bounds
  const { paths, centroids } = useMemo(() => {
    if (!geoData) return { paths: [], centroids: [] };

    const projection = geoMercator().fitSize([width - 40, height - 40], geoData as any);
    const pathGenerator = geoPath().projection(projection);

    const pList = geoData.features.map((feature) => {
      const enName = feature.properties.shapeName;
      const ruName = REGION_EN_TO_RU[enName] || enName;
      const pathString = pathGenerator(feature as any) || '';
      const centroid = pathGenerator.centroid(feature as any);
      return {
        feature,
        enName,
        ruName,
        pathString,
        centroid: isNaN(centroid[0]) ? null : centroid,
      };
    });

    return { paths: pList, centroids: pList.map((p) => p.centroid) };
  }, [geoData]);

  // Determine min and max counts for color scaling
  const { minCount, maxCount } = useMemo(() => {
    const counts = Object.values(regionCounts);
    if (counts.length === 0) return { minCount: 0, maxCount: 1 };
    return {
      minCount: Math.min(...counts),
      maxCount: Math.max(...counts, 1),
    };
  }, [regionCounts]);

  // Color interpolation using project palette (soft blue/accent gradient)
  const getRegionColor = (count: number, isSelected: boolean) => {
    if (isSelected) {
      return '#3B82F6'; // Highlighted selected region
    }
    if (count === 0) {
      return 'var(--color-surface-2)';
    }

    // Normalizing ratio between 0 and 1
    const ratio = Math.max(0, Math.min(1, (count - minCount) / (maxCount - minCount || 1)));

    // Scale from soft pastel tint to rich accent:
    // Light theme: rgb(215, 226, 255) -> rgb(75, 110, 245)
    // Dark theme handled via opacity and css variables
    const r = Math.round(218 - ratio * 140);
    const g = Math.round(230 - ratio * 125);
    const b = Math.round(255 - ratio * 20);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleMouseMove = (
    e: React.MouseEvent<SVGPathElement>,
    ruName: string,
    enName: string,
    count: number
  ) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = totalRespondents > 0 ? `${((count / totalRespondents) * 100).toFixed(1)}%` : '0%';
    setHoveredRegion({
      ruName,
      enName,
      count,
      percent,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoveredRegion(null);
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center bg-surface border border-border rounded-[8px] text-secondary text-xs">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2" />
        <span>Загрузка интерактивной карты Узбекистана...</span>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="h-96 w-full flex items-center justify-center bg-surface border border-border rounded-[8px] text-rose-500 text-xs">
        Не удалось загрузить географические данные регионов
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-surface border border-border/80 rounded-[8px] overflow-hidden p-3 select-none flex flex-col items-center shadow-xs"
    >
      {/* Map Header / Stats legend */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">14 административных регионов</span>
          <span className="text-secondary text-[11px]">
            • Кликните по области для детального анализа
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[11px] text-secondary">
          <span>Меньше ({minCount.toLocaleString()})</span>
          <div className="flex h-2.5 w-24 rounded-full overflow-hidden border border-border">
            <div className="flex-1 bg-[#D9E4FF]" />
            <div className="flex-1 bg-[#A6C0FE]" />
            <div className="flex-1 bg-[#6D95FD]" />
            <div className="flex-1 bg-[#466FF6]" />
          </div>
          <span>Больше ({maxCount.toLocaleString()})</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full flex justify-center py-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[580px] min-w-[640px]"
          style={{ transform: 'translateZ(0)' }}
        >
          <g transform="translate(20, 20)">
            {paths.map(({ feature, enName, ruName, pathString, centroid }) => {
              const count = regionCounts[ruName] || regionCounts[enName] || 0;
              const isSelected =
                selectedRegion !== null &&
                (normalizeRegionName(selectedRegion) === normalizeRegionName(ruName) ||
                  selectedRegion === enName);

              const fillColor = getRegionColor(count, isSelected);

              return (
                <g key={enName} className="transition-all duration-150">
                  <path
                    d={pathString}
                    fill={fillColor}
                    stroke={isSelected ? '#1D4ED8' : 'var(--color-surface)'}
                    strokeWidth={isSelected ? 2.5 : 1.2}
                    className="cursor-pointer transition-all duration-150 hover:brightness-95 dark:hover:brightness-125 focus:outline-none"
                    onClick={() => onSelectRegion(ruName)}
                    onMouseMove={(e) => handleMouseMove(e, ruName, enName, count)}
                    onMouseLeave={handleMouseLeave}
                  />

                  {/* Region Centroid Label */}
                  {centroid && (
                    <text
                      x={centroid[0]}
                      y={centroid[1]}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`text-[9px] pointer-events-none font-medium ${
                        isSelected
                          ? 'fill-white font-bold'
                          : 'fill-slate-800 dark:fill-slate-200'
                      }`}
                      style={{
                        textShadow: isSelected
                          ? '0 1px 2px rgba(0,0,0,0.6)'
                          : '0 1px 2px rgba(255,255,255,0.8), 0 0 1px rgba(0,0,0,0.4)',
                      }}
                    >
                      {ruName.replace(' область', '').replace('г. ', '')}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Hover Tooltip (Hover, no click) */}
      {hoveredRegion && (
        <div
          className="pointer-events-none absolute z-30 px-3 py-2 rounded-[6px] bg-slate-900/90 text-white dark:bg-surface dark:text-primary border border-slate-700/60 shadow-lg text-xs space-y-0.5 animate-in fade-in duration-75"
          style={{
            left: `${Math.min(hoveredRegion.x + 15, (containerRef.current?.clientWidth || 960) - 200)}px`,
            top: `${Math.max(hoveredRegion.y - 45, 10)}px`,
          }}
        >
          <div className="font-semibold text-[11px] text-white dark:text-primary">
            {hoveredRegion.ruName}
          </div>
          <div className="text-[10px] text-slate-300 dark:text-secondary">
            {hoveredRegion.enName}
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-700/50 text-[11px]">
            <span className="text-slate-300 dark:text-secondary">Респондентов:</span>
            <span className="font-bold tabular-nums text-white dark:text-primary">
              {hoveredRegion.count.toLocaleString('ru-RU')} ({hoveredRegion.percent})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
