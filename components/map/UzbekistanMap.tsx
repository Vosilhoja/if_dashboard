'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { geoMercator, geoPath, geoArea, geoBounds } from 'd3-geo';
import { REGION_EN_TO_RU, normalizeRegionName } from '@/lib/region-name-map';
import { ZoomIn, ZoomOut, RotateCcw, AlertTriangle, RefreshCw, MapPin } from 'lucide-react';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Zoom & Pan state
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const [hoveredRegion, setHoveredRegion] = useState<{
    ruName: string;
    enName: string;
    count: number;
    percent: string;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadGeoJSON = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch('/geo/uzbekistan-regions.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Ошибка загрузки географических данных`);
        return res.json();
      })
      .then((data: GeoJSONData) => {
        if (!data || !Array.isArray(data.features) || data.features.length === 0) {
          throw new Error('Файл GeoJSON не содержит полигонов регионов');
        }

        // Defensive rewind check: if any polygon has area > 2*PI, reverse its coordinates
        data.features.forEach((f) => {
          try {
            const a = geoArea(f as any);
            if (a > 2 * Math.PI) {
              if (f.geometry.type === 'Polygon') {
                f.geometry.coordinates.forEach((ring: any[]) => ring.reverse());
              } else if (f.geometry.type === 'MultiPolygon') {
                f.geometry.coordinates.forEach((poly: any[]) =>
                  poly.forEach((ring: any[]) => ring.reverse())
                );
              }
            }
          } catch (e) {
            console.warn('Could not check geoArea for feature', f.properties?.shapeName, e);
          }
        });

        setGeoData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Uzbekistan GeoJSON:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить карту');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadGeoJSON();
  }, [loadGeoJSON]);

  const width = 960;
  const height = 560;

  // D3 Mercator projection fitted to Uzbekistan bounds
  const { paths, featureBounds } = useMemo(() => {
    if (!geoData) return { paths: [], featureBounds: {} };

    try {
      const projection = geoMercator().fitSize([width - 60, height - 60], geoData as any);
      const pathGenerator = geoPath().projection(projection);

      const fBounds: Record<string, [[number, number], [number, number]]> = {};

      const pList = geoData.features
        .map((feature, idx) => {
          const enName = feature.properties?.shapeName || `Region_${idx}`;
          const ruName = REGION_EN_TO_RU[enName] || enName;

          let pathString = '';
          let centroid: [number, number] | null = null;

          try {
            pathString = pathGenerator(feature as any) || '';
            const c = pathGenerator.centroid(feature as any);
            if (c && !isNaN(c[0]) && !isNaN(c[1])) {
              centroid = [c[0], c[1]];
            }

            const bounds = pathGenerator.bounds(feature as any);
            if (bounds && !isNaN(bounds[0][0])) {
              fBounds[ruName] = bounds;
            }
          } catch (genErr) {
            console.warn(`Path generation failed for feature ${enName}:`, genErr);
            return null;
          }

          if (!pathString) return null;

          return {
            feature,
            enName,
            ruName,
            pathString,
            centroid,
          };
        })
        .filter(Boolean) as {
        feature: GeoFeature;
        enName: string;
        ruName: string;
        pathString: string;
        centroid: [number, number] | null;
      }[];

      return { paths: pList, featureBounds: fBounds };
    } catch (projErr) {
      console.error('Projection fitting error:', projErr);
      return { paths: [], featureBounds: {} };
    }
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

  // Color interpolation for choropleth gradient
  const getRegionColor = useCallback(
    (count: number, isSelected: boolean) => {
      if (isSelected) {
        return '#3B82F6'; // Highlighted selected region
      }
      if (count === 0) {
        return 'var(--color-surface-2)';
      }

      const ratio = Math.max(0, Math.min(1, (count - minCount) / (maxCount - minCount || 1)));

      // Interpolation: Light sky-blue (#D9E4FF) -> Rich vibrant cobalt (#365EEA)
      const r = Math.round(217 - ratio * 163);
      const g = Math.round(228 - ratio * 134);
      const b = Math.round(255 - ratio * 21);

      return `rgb(${r}, ${g}, ${b})`;
    },
    [minCount, maxCount]
  );

  // Zoom to selected region bounds if selected
  const zoomToRegion = useCallback(
    (ruName: string) => {
      const bounds = featureBounds[ruName];
      if (!bounds) return;

      const [[x0, y0], [x1, y1]] = bounds;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const x = (x0 + x1) / 2;
      const y = (y0 + y1) / 2;

      const scale = Math.max(1, Math.min(4, 0.8 / Math.max(dx / width, dy / height)));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];

      setTransform({ k: scale, x: translate[0], y: translate[1] });
    },
    [featureBounds, width, height]
  );

  // Trigger zoom when selectedRegion changes
  useEffect(() => {
    if (selectedRegion && selectedRegion.trim() !== '') {
      const canonical = normalizeRegionName(selectedRegion);
      zoomToRegion(canonical);
    }
  }, [selectedRegion, zoomToRegion]);

  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      k: Math.min(prev.k * 1.3, 5),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      k: Math.max(prev.k / 1.3, 0.8),
    }));
  };

  const handleResetZoom = () => {
    setTransform({ k: 1, x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setTransform((prev) => ({
      ...prev,
      k: Math.max(0.8, Math.min(5, prev.k * zoomFactor)),
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMoveMap = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleRegionHover = (
    e: React.MouseEvent<SVGPathElement>,
    ruName: string,
    enName: string,
    count: number
  ) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent =
      totalRespondents > 0 ? `${((count / totalRespondents) * 100).toFixed(1)}%` : '0%';
    setHoveredRegion({
      ruName,
      enName,
      count,
      percent,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleRegionClick = (ruName: string) => {
    onSelectRegion(ruName);
    zoomToRegion(ruName);
  };

  if (loading) {
    return (
      <div className="w-full bg-surface border border-border/80 rounded-[8px] p-6 flex flex-col items-center justify-center min-h-[480px] space-y-4 animate-pulse">
        <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span>Загрузка векторных полигонов 14 регионов...</span>
        </div>
        {/* Animated Skeleton Map Representation */}
        <div className="w-full max-w-2xl h-72 bg-neutral-100 dark:bg-surface-2/60 rounded-[8px] flex items-center justify-center p-8 border border-border/50">
          <div className="grid grid-cols-4 gap-3 w-full h-full opacity-60">
            <div className="col-span-2 row-span-2 bg-neutral-200 dark:bg-surface-2 rounded" />
            <div className="bg-neutral-200 dark:bg-surface-2 rounded" />
            <div className="bg-neutral-200 dark:bg-surface-2 rounded" />
            <div className="bg-neutral-200 dark:bg-surface-2 rounded" />
            <div className="bg-neutral-200 dark:bg-surface-2 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !geoData) {
    return (
      <div className="w-full bg-surface border border-rose-500/30 rounded-[8px] p-8 flex flex-col items-center justify-center min-h-[400px] space-y-3 text-center">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-primary">Ошибка отображения карты</h3>
          <p className="text-xs text-secondary max-w-md">{error || 'Географические данные не найдены'}</p>
        </div>
        <button
          onClick={loadGeoJSON}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-95 text-xs font-medium transition-all shadow-xs cursor-pointer mt-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Повторить загрузку</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-surface border border-border/80 rounded-[8px] overflow-hidden p-3 select-none flex flex-col items-center shadow-xs"
    >
      {/* Map Header / Stats legend & Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-primary">14 административных регионов</span>
          <span className="text-secondary text-[11px] hidden sm:inline">
            • Кликните по области для приближения и деталей
          </span>
        </div>

        {/* Legend & Zoom Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] text-secondary">
            <span>Меньше ({minCount.toLocaleString('ru-RU')})</span>
            <div className="flex h-2.5 w-24 rounded-full overflow-hidden border border-border">
              <div className="flex-1 bg-[#D9E4FF]" />
              <div className="flex-1 bg-[#A6C0FE]" />
              <div className="flex-1 bg-[#6D95FD]" />
              <div className="flex-1 bg-[#365EEA]" />
            </div>
            <span>Больше ({maxCount.toLocaleString('ru-RU')})</span>
          </div>

          {/* Zoom controls bar */}
          <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-[6px] border border-border">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-[4px] hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Приблизить"
              aria-label="Приблизить"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-[4px] hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Отдалить"
              aria-label="Отдалить"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-[4px] hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Сбросить масштаб"
              aria-label="Сбросить масштаб"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        className="w-full flex justify-center py-2 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveMap}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[560px] min-h-[320px] transition-transform duration-75"
          style={{ transform: 'translateZ(0)' }}
        >
          <g
            transform={`translate(${transform.x + 30}, ${transform.y + 30}) scale(${transform.k})`}
            className="transition-transform duration-100 ease-out"
          >
            {paths.map(({ enName, ruName, pathString, centroid }) => {
              const count = regionCounts[ruName] || regionCounts[enName] || 0;

              // Strict isSelected comparison
              const isSelected = Boolean(
                selectedRegion &&
                  selectedRegion.trim() !== '' &&
                  (normalizeRegionName(selectedRegion) === normalizeRegionName(ruName) ||
                    selectedRegion.trim().toLowerCase() === enName.toLowerCase())
              );

              const fillColor = getRegionColor(count, isSelected);

              return (
                <g key={enName} className="group/region">
                  <path
                    d={pathString}
                    fill={fillColor}
                    stroke={isSelected ? '#1D4ED8' : 'var(--color-surface)'}
                    strokeWidth={isSelected ? 2.5 / transform.k : 1.2 / transform.k}
                    className="cursor-pointer transition-colors duration-150 hover:brightness-95 dark:hover:brightness-125 focus:outline-none"
                    onClick={() => handleRegionClick(ruName)}
                    onMouseMove={(e) => handleRegionHover(e, ruName, enName, count)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  />

                  {/* Region Centroid Label */}
                  {centroid && (
                    <text
                      x={centroid[0]}
                      y={centroid[1]}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`pointer-events-none select-none font-semibold transition-opacity duration-150 ${
                        isSelected
                          ? 'fill-white text-[11px]'
                          : 'fill-slate-900 dark:fill-slate-100 text-[10px]'
                      }`}
                      style={{
                        fontSize: `${Math.max(8, Math.min(13, 10 / Math.sqrt(transform.k)))}px`,
                        textShadow: isSelected
                          ? '0 1px 3px rgba(0,0,0,0.8)'
                          : '0 1px 2px rgba(255,255,255,0.9), 0 0 2px rgba(0,0,0,0.4)',
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

      {/* Floating Hover Tooltip */}
      {hoveredRegion && (
        <div
          className="pointer-events-none absolute z-30 px-3 py-2 rounded-[6px] bg-slate-900/95 text-white dark:bg-surface dark:text-primary border border-slate-700/60 shadow-xl text-xs space-y-0.5 animate-in fade-in duration-75"
          style={{
            left: `${Math.min(hoveredRegion.x + 15, (containerRef.current?.clientWidth || 960) - 220)}px`,
            top: `${Math.max(hoveredRegion.y - 50, 15)}px`,
          }}
        >
          <div className="flex items-center gap-1.5 font-bold text-[12px] text-white dark:text-primary">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            <span>{hoveredRegion.ruName}</span>
          </div>
          <div className="text-[10px] text-slate-300 dark:text-secondary pl-5">
            {hoveredRegion.enName}
          </div>
          <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-700/60 text-[11px] mt-1">
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
