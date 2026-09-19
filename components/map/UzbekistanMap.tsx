'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { REGION_EN_TO_RU, normalizeRegionName } from '@/lib/region-name-map';
import { ZoomIn, ZoomOut, RotateCcw, AlertTriangle, RefreshCw, MapPin, Maximize2, TrendingUp, TrendingDown, Minus as MinusIcon, Trophy } from 'lucide-react';

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

interface RegionMetrics {
  ruName: string;
  enName: string;
  count: number;
  percent: string;
  percentNum: number;
  rank: number;
  change: number | null;
  changePercent: string | null;
  changeDir: 'up' | 'down' | 'flat' | null;
}

interface UzbekistanMapProps {
  regionCounts: Record<string, number>;
  previousRegionCounts?: Record<string, number>;
  totalRespondents: number;
  selectedRegion: string | null;
  onSelectRegion: (ruName: string) => void;
  onDeselect?: () => void;
  onHoverRegion?: (ruName: string | null) => void;
  hoveredRegion?: string | null;
  embedded?: boolean;
}

let geoJsonPromise: Promise<GeoJSONData> | null = null;

function getGeoJSON(): Promise<GeoJSONData> {
  if (!geoJsonPromise) {
    geoJsonPromise = fetch('/geo/uzbekistan-regions.geojson', { cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Ошибка загрузки географических данных`);
        return res.json() as Promise<GeoJSONData>;
      })
      .then((data) => {
        if (!data || !Array.isArray(data.features) || data.features.length === 0) {
          throw new Error('Файл GeoJSON не содержит полигонов регионов');
        }
        return data;
      })
      .catch((error) => {
        geoJsonPromise = null;
        throw error;
      });
  }
  return geoJsonPromise;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const REGION_FOCUS_MAX_ZOOM = 2.5;
const ZOOM_STEP = 1.25;
const WHEEL_ZOOM_FACTOR = 1.06;
const LEGEND_BINS = 5;

const LEGEND_COLORS = ['#EEF2FF', '#C7D2FE', '#818CF8', '#4F46E5', '#3730A3'];

function resolveBBox(
  features: { pathString: string; centroid: [number, number] | null; ruName: string }[],
  width: number,
  height: number,
  margin: number = 30
) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    if (!f.pathString) continue;
    const re = /-?\d+\.?\d*/g;
    const nums = [...f.pathString.matchAll(re)].map(m => parseFloat(m[0]));
    for (let i = 0; i < nums.length; i += 2) {
      const x = nums[i], y = nums[i + 1];
      if (isNaN(x) || isNaN(y)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!isFinite(minX)) {
    return { minX: margin, minY: margin, maxX: width - margin, maxY: height - margin };
  }
  return { minX, minY, maxX, maxY };
}

interface LabelRect {
  ruName: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  x: number;
  y: number;
}

function layoutLabels(
  input: { ruName: string; cx: number; cy: number; displayName: string; fontSize: number }[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const approxW = (name: string, fs: number) => Math.max(36, name.length * fs * 0.55 + 6);
  const approxH = (fs: number) => fs * 1.3 + 4;

  const rects: LabelRect[] = input.map(({ ruName, cx, cy, displayName, fontSize }) => {
    const w = approxW(displayName, fontSize);
    const h = approxH(fontSize);
    return { ruName, cx, cy, w, h, x: cx - w / 2, y: cy - h / 2 };
  });

  const placed: LabelRect[] = [];
  const out = new Map<string, { x: number; y: number }>();

  rects.sort((a, b) => (b.w * b.h) - (a.w * a.h));

  for (const r of rects) {
    const candidates: { dx: number; dy: number }[] = [{ dx: 0, dy: 0 }];
    const step = Math.max(4, Math.min(r.w, r.h) / 2);
    for (let ring = 1; ring <= 8; ring++) {
      for (let i = -ring; i <= ring; i++) {
        candidates.push({ dx: i * step, dy: -ring * step });
        candidates.push({ dx: i * step, dy: ring * step });
        candidates.push({ dx: -ring * step, dy: i * step });
        candidates.push({ dx: ring * step, dy: i * step });
      }
    }

    let placedOk = false;
    for (const c of candidates) {
      const tx = r.cx - r.w / 2 + c.dx;
      const ty = r.cy - r.h / 2 + c.dy;
      if (tx < 5 || ty < 5 || tx + r.w > width - 5 || ty + r.h > height - 5) continue;
      let collides = false;
      for (const p of placed) {
        if (tx < p.x + p.w && tx + r.w > p.x && ty < p.y + p.h && ty + r.h > p.y) {
          collides = true;
          break;
        }
      }
      if (!collides) {
        r.x = tx;
        r.y = ty;
        placed.push(r);
        out.set(r.ruName, { x: tx + r.w / 2, y: ty + r.h / 2 });
        placedOk = true;
        break;
      }
    }
    if (!placedOk) {
      r.x = r.cx - r.w / 2;
      r.y = r.cy - r.h / 2;
      placed.push(r);
      out.set(r.ruName, { x: r.cx, y: r.cy });
    }
  }

  return out;
}

export const UzbekistanMap: React.FC<UzbekistanMapProps> = ({
  regionCounts,
  previousRegionCounts,
  totalRespondents,
  selectedRegion,
  onSelectRegion,
  onDeselect,
  onHoverRegion,
  hoveredRegion: externalHoveredRegion,
  embedded = false,
}) => {
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const panPointerId = useRef<number | null>(null);
  const startPan = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const isPanningRef = useRef(false);
  const didPanRef = useRef(false);
  const transformRef = useRef(transform);

  const [internalHovered, setInternalHovered] = useState<string | null>(null);
  const activeHovered = externalHoveredRegion ?? internalHovered;

  const [flashRegion, setFlashRegion] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapBBoxRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  const activeHoveredRegion = useRef<string | null>(null);
  activeHoveredRegion.current = activeHovered;

  const loadGeoJSON = useCallback(() => {
    setLoading(true);
    setError(null);

    getGeoJSON()
      .then((data) => {
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
  const pad = 30;

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

      const bbox = resolveBBox(pList, width, height, pad);
      mapBBoxRef.current = bbox;

      return { paths: pList, featureBounds: fBounds };
    } catch (projErr) {
      console.error('Projection fitting error:', projErr);
      return { paths: [], featureBounds: {} };
    }
  }, [geoData]);

  const regionMetrics = useMemo((): Map<string, RegionMetrics> => {
    const map = new Map<string, RegionMetrics>();

    const entries = paths.map(({ ruName, enName }) => {
      const count = regionCounts[ruName] || regionCounts[enName] || 0;
      const prevCount = previousRegionCounts
        ? (previousRegionCounts[ruName] || previousRegionCounts[enName] || 0)
        : null;

      let change: number | null = null;
      let changePercent: string | null = null;
      let changeDir: 'up' | 'down' | 'flat' | null = null;

      if (prevCount !== null) {
        change = count - prevCount;
        if (prevCount > 0) {
          const cp = ((change / prevCount) * 100);
          changePercent = `${cp >= 0 ? '+' : ''}${cp.toFixed(1)}%`;
          changeDir = cp > 0.01 ? 'up' : cp < -0.01 ? 'down' : 'flat';
        } else if (count > 0) {
          changePercent = '+∞';
          changeDir = 'up';
        } else {
          changePercent = '0%';
          changeDir = 'flat';
        }
      }

      const percentNum = totalRespondents > 0 ? (count / totalRespondents) * 100 : 0;
      const percent = `${percentNum.toFixed(1)}%`;

      return { ruName, enName, count, percent, percentNum, change, changePercent, changeDir };
    });

    entries.sort((a, b) => b.count - a.count);
    entries.forEach((e, i) => {
      map.set(e.ruName, { ...e, rank: i + 1 });
    });

    return map;
  }, [paths, regionCounts, previousRegionCounts, totalRespondents]);

  const { minCount, maxCount, legendBins } = useMemo((): {
    minCount: number;
    maxCount: number;
    legendBins: { from: number; to: number; label: string }[];
  } => {
    const counts = paths.map(p => regionCounts[p.ruName] || regionCounts[p.enName] || 0);
    if (counts.length === 0) {
      return {
        minCount: 0,
        maxCount: 1,
        legendBins: [0, 0, 0, 0, 0].map((_, i: number) => ({ from: i, to: i, label: `${i}` })),
      };
    }
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts, 1);
    const range = maxCount - minCount;
    const bins: { from: number; to: number; label: string }[] = [];
    for (let i = 0; i < LEGEND_BINS; i++) {
      const from = i === 0 ? minCount : Math.round(minCount + (range * i) / LEGEND_BINS);
      const to = i === LEGEND_BINS - 1 ? maxCount : Math.round(minCount + (range * (i + 1)) / LEGEND_BINS);
      const label = i === LEGEND_BINS - 1
        ? `${from.toLocaleString('ru-RU')}+`
        : `${from.toLocaleString('ru-RU')} — ${to.toLocaleString('ru-RU')}`;
      bins.push({ from, to, label });
    }
    return { minCount, maxCount, legendBins: bins };
  }, [paths, regionCounts]);

  const getRegionColor = useCallback(
    (count: number, isSelected: boolean) => {
      if (isSelected) {
        return 'var(--color-accent, #4F46E5)';
      }
      if (count === 0) {
        return 'var(--color-surface-2, #F5F5F4)';
      }

      const range = maxCount - minCount || 1;
      const ratio = Math.max(0, Math.min(1, (count - minCount) / range));
      const binIdx = Math.min(LEGEND_BINS - 1, Math.floor(ratio * LEGEND_BINS));
      return LEGEND_COLORS[binIdx];
    },
    [minCount, maxCount]
  );

  const labelPositions = useMemo(() => {
    if (paths.length === 0) return new Map<string, { x: number; y: number }>();
    const fontSize = 10;
    const items = paths
      .filter(p => p.centroid)
      .map(p => ({
        ruName: p.ruName,
        cx: p.centroid![0],
        cy: p.centroid![1],
        displayName: p.ruName.replace(' область', '').replace('г. ', ''),
        fontSize,
      }));
    return layoutLabels(items, width - pad * 2, height - pad * 2);
  }, [paths]);

  const constrainTransform = useCallback(
    (k: number, tx: number, ty: number): { k: number; x: number; y: number } => {
      const clampedK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k));
      const bbox = mapBBoxRef.current;
      if (!bbox) {
        return { k: clampedK, x: tx, y: ty };
      }
      const innerW = (bbox.maxX - bbox.minX);
      const innerH = (bbox.maxY - bbox.minY);
      const scaledW = innerW * clampedK;
      const scaledH = innerH * clampedK;

      const availW = width - pad * 2;
      const availH = height - pad * 2;

      const baseShiftX = pad - bbox.minX * clampedK;
      const baseShiftY = pad - bbox.minY * clampedK;

      let maxTx: number, minTx: number;
      if (scaledW <= availW) {
        const centerTx = (availW - scaledW) / 2 + baseShiftX;
        maxTx = centerTx;
        minTx = centerTx;
      } else {
        maxTx = baseShiftX + (availW - scaledW);
        minTx = baseShiftX;
      }

      let maxTy: number, minTy: number;
      if (scaledH <= availH) {
        const centerTy = (availH - scaledH) / 2 + baseShiftY;
        maxTy = centerTy;
        minTy = centerTy;
      } else {
        maxTy = baseShiftY + (availH - scaledH);
        minTy = baseShiftY;
      }

      return {
        k: clampedK,
        x: Math.min(maxTx, Math.max(minTx, tx)),
        y: Math.min(maxTy, Math.max(minTy, ty)),
      };
    },
    []
  );

  const applyTransform = useCallback(
    (k: number, tx: number, ty: number) => {
      const constrained = constrainTransform(k, tx, ty);
      transformRef.current = constrained;
      setTransform(constrained);
    },
    [constrainTransform]
  );

  const zoomToRegion = useCallback(
    (ruName: string) => {
      const bounds = featureBounds[ruName];
      if (!bounds) return;

      const [[x0, y0], [x1, y1]] = bounds;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const x = (x0 + x1) / 2;
      const y = (y0 + y1) / 2;

      // Small administrative features such as Tashkent city would otherwise
      // produce an extreme auto-zoom and move the rest of the map off-screen.
      const scale = Math.max(
        MIN_ZOOM,
        Math.min(REGION_FOCUS_MAX_ZOOM, 0.78 / Math.max(dx / width, dy / height))
      );
      // The detail panel occupies the right side of the map section. Focus
      // the selected region in the remaining left-hand viewport instead of
      // centering it underneath the panel.
      const focusX = width * 0.38;
      const translate = [focusX - scale * x, height / 2 - scale * y];

      // This focus intentionally uses the left map viewport; the normal
      // full-width bounds would clamp the translation underneath the panel.
      setTransform({
        k: scale,
        x: translate[0] - pad,
        y: translate[1] - pad,
      });
    },
    [featureBounds, width, height]
  );

  useEffect(() => {
    if (!selectedRegion || selectedRegion.trim() === '') return;
    zoomToRegion(normalizeRegionName(selectedRegion));
  }, [selectedRegion, zoomToRegion]);

  const handleZoomIn = () => {
    const newK = Math.min(MAX_ZOOM, transform.k * ZOOM_STEP);
    const cx = width / 2 - pad;
    const cy = height / 2 - pad;
    const factor = newK / transform.k;
    const newTx = cx - (cx - transform.x) * factor;
    const newTy = cy - (cy - transform.y) * factor;
    applyTransform(newK, newTx, newTy);
  };

  const handleZoomOut = () => {
    const newK = Math.max(MIN_ZOOM, transform.k / ZOOM_STEP);
    const cx = width / 2 - pad;
    const cy = height / 2 - pad;
    const factor = newK / transform.k;
    const newTx = cx - (cx - transform.x) * factor;
    const newTy = cy - (cy - transform.y) * factor;
    applyTransform(newK, newTx, newTy);
  };

  const handleFitToScreen = () => {
    applyTransform(1, 0, 0);
  };

  const handleResetZoom = () => {
    applyTransform(1, 0, 0);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.altKey) return;
    e.preventDefault();
    const delta = e.deltaY;
    const factor = delta < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    if (!containerRef.current) {
      const newK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.k * factor));
      applyTransform(newK, transform.x, transform.y);
      return;
    }
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;
    const svgRect = svgEl.getBoundingClientRect();
    const px = (e.clientX - svgRect.left) * (width / svgRect.width);
    const py = (e.clientY - svgRect.top) * (height / svgRect.height);
    const fx = px - pad;
    const fy = py - pad;
    const newK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.k * factor));
    const scaleRatio = newK / transform.k;
    const newTx = fx - (fx - transform.x) * scaleRatio;
    const newTy = fy - (fy - transform.y) * scaleRatio;
    applyTransform(newK, newTx, newTy);
  }, [applyTransform, transform]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleNativeWheel = (event: WheelEvent) => {
      if (!event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      handleWheel(event as unknown as React.WheelEvent);
    };

    element.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true });
    return () => element.removeEventListener('wheel', handleNativeWheel, true);
  }, [handleWheel]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    panPointerId.current = e.pointerId;
    isPanningRef.current = true;
    didPanRef.current = false;
    startPan.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transformRef.current.x,
      ty: transformRef.current.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current || panPointerId.current !== e.pointerId) return;
    e.preventDefault();
    const svgEl = containerRef.current?.querySelector('svg');
    let ratioX = 1;
    let ratioY = 1;
    if (svgEl) {
      const rect = svgEl.getBoundingClientRect();
      ratioX = width / rect.width;
      ratioY = height / rect.height;
    }
    const dx = (e.clientX - startPan.current.x) * ratioX;
    const dy = (e.clientY - startPan.current.y) * ratioY;
    if (Math.abs(e.clientX - startPan.current.x) > 4 || Math.abs(e.clientY - startPan.current.y) > 4) {
      didPanRef.current = true;
    }
    applyTransform(transformRef.current.k, startPan.current.tx + dx, startPan.current.ty + dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panPointerId.current !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    panPointerId.current = null;
    isPanningRef.current = false;
  };

  const handleRegionHoverEnter = (
    ruName: string
  ) => {
    setInternalHovered(ruName);
    if (onHoverRegion) onHoverRegion(ruName);
  };

  const handleRegionHoverLeave = () => {
    setInternalHovered(null);
    if (onHoverRegion) onHoverRegion(null);
  };

  const handleRegionClick = (e: React.MouseEvent, ruName: string) => {
    e.stopPropagation();
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    const isAlreadySelected = Boolean(
      selectedRegion &&
        selectedRegion.trim() !== '' &&
        (normalizeRegionName(selectedRegion) === normalizeRegionName(ruName) ||
          selectedRegion.trim().toLowerCase() === ruName.toLowerCase())
    );
    if (isAlreadySelected) {
      if (onDeselect) onDeselect();
      else onSelectRegion('');
      handleFitToScreen();
    } else {
      setFlashRegion(ruName);
      setTimeout(() => setFlashRegion(null), 200);
      onSelectRegion(ruName);
      zoomToRegion(ruName);
    }
  };

  const hoveredMetrics = activeHovered ? regionMetrics.get(activeHovered) : null;

  if (loading) {
    return (
      <div className="w-full bg-surface border border-border/80 rounded-[8px] p-6 flex flex-col items-center justify-center min-h-[480px] space-y-4 animate-pulse">
        <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span>Загрузка векторных полигонов 14 регионов...</span>
        </div>
        <div className="w-full max-w-2xl h-72 bg-surface-2/60 rounded-[8px] flex items-center justify-center p-8 border border-border/50">
          <div className="grid grid-cols-4 gap-3 w-full h-full opacity-60">
            <div className="col-span-2 row-span-2 bg-surface-2 rounded" />
            <div className="bg-surface-2 rounded" />
            <div className="bg-surface-2 rounded" />
            <div className="bg-surface-2 rounded" />
            <div className="bg-surface-2 rounded" />
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
      className={`relative isolate w-full min-h-[620px] overflow-hidden bg-surface select-none flex flex-col ${
        embedded
          ? 'rounded-none border-0 shadow-none'
          : 'rounded-2xl border border-border/80 shadow-xs'
      }`}
    >
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border/60 text-xs bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-primary">14 административных регионов</span>
          <span className="text-secondary text-[11px] hidden sm:inline">
            • Кликните по области для приближения, Alt + колесо — зум, перетаскивание — панорама
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-secondary">
          <span className="hidden sm:inline">Наведите или выберите регион</span>
        </div>
      </div>

      <div className="relative min-h-[560px] w-full flex-1">
        <div
          className="flex min-h-[560px] w-full items-center justify-center overflow-hidden py-3 cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-auto w-full max-h-[620px] min-h-[520px]"
            style={{ transform: 'translateZ(0)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget || (e.target as SVGElement).tagName === 'rect') {
                if (selectedRegion) {
                  if (onDeselect) onDeselect();
                  else onSelectRegion('');
                }
              }
            }}
          >
            <rect
              width={width}
              height={height}
              fill="transparent"
              className="cursor-default"
              onClick={() => {
                if (selectedRegion) {
                  if (onDeselect) onDeselect();
                  else onSelectRegion('');
                }
              }}
            />
            <g
              transform={`translate(${transform.x + pad}, ${transform.y + pad}) scale(${transform.k})`}
              className="origin-top-left"
              style={{ transformOrigin: `${pad}px ${pad}px` }}
            >
              {paths.map(({ enName, ruName, pathString }) => {
                const count = regionCounts[ruName] || regionCounts[enName] || 0;

                const isSelected = Boolean(
                  selectedRegion &&
                    selectedRegion.trim() !== '' &&
                    (normalizeRegionName(selectedRegion) === normalizeRegionName(ruName) ||
                      selectedRegion.trim().toLowerCase() === enName.toLowerCase())
                );

                const isHovered =
                  activeHovered !== null &&
                  (normalizeRegionName(activeHovered) === normalizeRegionName(ruName) ||
                    activeHovered.toLowerCase() === enName.toLowerCase());

                const isFlashing = Boolean(
                  flashRegion &&
                    (normalizeRegionName(flashRegion) === normalizeRegionName(ruName) ||
                      flashRegion.trim().toLowerCase() === enName.toLowerCase())
                );

                const fillColor = isFlashing
                  ? '#A5B4FC'
                  : getRegionColor(count, isSelected);

                const labelPos = labelPositions.get(ruName);
                const shortName = ruName.replace(' область', '').replace('г. ', '');

                return (
                  <g key={enName} className="group/region">
                    <path
                      d={pathString}
                      fill={fillColor}
                      stroke={isSelected
                        ? 'var(--color-accent, #4F46E5)'
                        : isHovered
                        ? 'var(--color-accent, #4F46E5)'
                        : 'var(--color-border, #D6D3D1)'}
                      strokeWidth={isSelected
                        ? 2.5 / transform.k
                        : isHovered
                        ? 2 / transform.k
                        : 1.2 / transform.k}
                      style={{
                        filter: isHovered && !isSelected ? 'brightness(0.92)' : undefined,
                      }}
                      className="cursor-pointer transition-all duration-150 focus:outline-none"
                      onClick={(e) => handleRegionClick(e, ruName)}
                      onMouseEnter={() => handleRegionHoverEnter(ruName)}
                      onMouseLeave={handleRegionHoverLeave}
                    />

                    {labelPos && (
                      <g
                        transform={`translate(${labelPos.x}, ${labelPos.y})`}
                        className="pointer-events-none select-none"
                      >
                        <rect
                          x={-shortName.length * 2.9 - 3}
                          y={-7}
                          rx={3}
                          ry={3}
                          width={shortName.length * 5.8 + 6}
                          height={14}
                          fill={isSelected ? 'rgba(79, 70, 229, 0.92)' : 'rgba(255, 255, 255, 0.86)'}
                          stroke={isSelected ? 'rgba(255,255,255,0.35)' : 'rgba(100, 116, 139, 0.22)'}
                          strokeWidth={0.5 / transform.k}
                          className={isHovered || isSelected ? '' : 'opacity-85'}
                        />
                        <text
                          x={0}
                          y={0}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className={`pointer-events-none select-none font-semibold ${
                            isSelected ? 'fill-white' : 'fill-slate-900 dark:fill-slate-800'
                          }`}
                          style={{
                            fontSize: `${Math.max(7.5, Math.min(11, 9.5 / Math.sqrt(Math.max(1, transform.k / 1.8))))}px`,
                            paintOrder: 'stroke',
                            stroke: isSelected ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.35)',
                            strokeWidth: isSelected ? 0 : 0.4 / transform.k,
                          }}
                        >
                          {shortName}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <div className="flex flex-col items-center bg-surface/95 backdrop-blur-sm rounded-[8px] border border-border shadow-lg overflow-hidden">
            <button
              onClick={handleZoomIn}
              disabled={transform.k >= MAX_ZOOM}
              className="w-9 h-9 flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-b border-border"
              title={`Приблизить (макс. ${MAX_ZOOM}x)`}
              aria-label="Приблизить"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-9 h-6 flex items-center justify-center text-[10px] font-bold tabular-nums text-secondary border-b border-border bg-surface-2/40">
              {transform.k.toFixed(1)}x
            </div>
            <button
              onClick={handleZoomOut}
              disabled={transform.k <= MIN_ZOOM}
              className="w-9 h-9 flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-b border-border"
              title={`Отдалить (мин. ${MIN_ZOOM}x)`}
              aria-label="Отдалить"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="w-9 h-9 flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer border-b border-border"
              title="Вписать в экран"
              aria-label="Вписать в экран"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                handleResetZoom();
                if (onDeselect) onDeselect();
                else onSelectRegion('');
              }}
              className="w-9 h-9 flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer"
              title="Сбросить всё"
              aria-label="Сбросить всё"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-2 bg-surface/95 backdrop-blur-sm rounded-[8px] border border-border shadow-lg p-3 w-56">
          <div className="flex items-center gap-1.5 pb-1 border-b border-border/60">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
              Легенда
            </span>
          </div>
          <div className="space-y-1.5">
            {legendBins.map((bin, idx) => {
              const swatchColor = LEGEND_COLORS[idx];
              return (
                <div key={idx} className="flex items-center gap-2 text-[11px]">
                  <div
                    className="w-4 h-4 rounded-[3px] shrink-0 border border-border/60"
                    style={{ backgroundColor: swatchColor }}
                  />
                  <span className="text-secondary tabular-nums flex-1">{bin.label}</span>
                  <span className="text-[10px] text-secondary/70">чел.</span>
                </div>
              );
            })}
          </div>
          <div className="pt-1.5 mt-1 border-t border-border/60 flex items-center justify-between text-[10px] text-secondary">
            <span>Минимум: <span className="font-semibold text-primary tabular-nums">{minCount.toLocaleString('ru-RU')}</span></span>
            <span>Максимум: <span className="font-semibold text-primary tabular-nums">{maxCount.toLocaleString('ru-RU')}</span></span>
          </div>
        </div>

        {hoveredMetrics && (
          <div className="absolute top-3 left-3 z-20 bg-surface/98 backdrop-blur-sm rounded-[8px] border border-accent/40 shadow-xl p-3 w-64 animate-in fade-in duration-100">
            <div className="flex items-start gap-2 pb-2 border-b border-border/60">
              <div className="w-7 h-7 rounded-[6px] bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-primary leading-tight truncate">
                  {hoveredMetrics.ruName}
                </div>
                <div className="text-[10px] text-secondary mt-0.5">
                  {hoveredMetrics.enName}
                </div>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Trophy className="w-3 h-3" />
                <span className="text-[11px] font-bold tabular-nums">#{hoveredMetrics.rank}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-secondary">Респондентов</span>
                <span className="font-bold text-primary tabular-nums">
                  {hoveredMetrics.count.toLocaleString('ru-RU')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-secondary">Доля от страны</span>
                <span className="font-bold text-primary tabular-nums">{hoveredMetrics.percent}</span>
              </div>

              <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${Math.min(100, hoveredMetrics.percentNum * 5)}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                <span className="text-secondary">Изменение vs пред.</span>
                {hoveredMetrics.change !== null && hoveredMetrics.changePercent ? (
                  <div className={`flex items-center gap-0.5 font-bold tabular-nums ${
                    hoveredMetrics.changeDir === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : hoveredMetrics.changeDir === 'down'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-secondary'
                  }`}>
                    {hoveredMetrics.changeDir === 'up' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : hoveredMetrics.changeDir === 'down' ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <MinusIcon className="w-3 h-3" />
                    )}
                    <span>
                      {hoveredMetrics.change >= 0 ? '+' : ''}
                      {hoveredMetrics.change.toLocaleString('ru-RU')} ({hoveredMetrics.changePercent})
                    </span>
                  </div>
                ) : (
                  <span className="text-secondary/60 italic text-[10px]">нет данных</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
