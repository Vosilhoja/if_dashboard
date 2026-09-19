'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { UzbekistanMap } from '@/components/map/UzbekistanMap';
import { RegionDetailPanel } from '@/components/map/RegionDetailPanel';
import { DateFilter } from '@/components/DateFilter';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { AnalyticsRow } from '@/lib/analytics-aggregations';
import { normalizeRegionName, REGION_RU_TO_EN } from '@/lib/region-name-map';
import {
  Map as MapIcon,
  X,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  Trophy,
  MapPin,
  ChevronUp,
  ChevronDown,
  Minus as MinusIcon,
  TrendingUp,
  TrendingDown,
  ListOrdered,
} from 'lucide-react';

interface RankedRegionRow {
  ruName: string;
  displayName: string;
  count: number;
  percent: string;
  percentNum: number;
  rank: number;
  change: number | null;
  changePercent: string | null;
  changeDir: 'up' | 'down' | 'flat' | null;
}

export default function MapPage() {
  const {
    startDate,
    endDate,
    filterMode,
    currentDate,
    weekStartsOn,
    setFilterMode,
    setCurrentDate,
    setDateRange,
    selectedRegion,
    setSelectedRegion,
    selectedDistrict,
    setSelectedDistrict,
  } = useAnalyticsFilter();

  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [previousRows, setPreviousRows] = useState<AnalyticsRow[]>([]);
  const [, setTotalCountryRows] = useState<number>(0);
  const [, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAnalyticsData() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await fetch(`/api/proxy/data/analytics?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.rows) {
          setRows(data.rows);
          setTotalCountryRows(data.allRowsCount || data.rows.length);
        }

        if (startDate && endDate) {
          try {
            const prevParams = new URLSearchParams();
            const s = new Date(startDate);
            const e = new Date(endDate);
            const durMs = e.getTime() - s.getTime();
            const prevEnd = new Date(s.getTime() - 86400000);
            const prevStart = new Date(prevEnd.getTime() - durMs);
            prevParams.set('startDate', prevStart.toISOString().slice(0, 10));
            prevParams.set('endDate', prevEnd.toISOString().slice(0, 10));

            const prevRes = await fetch(`/api/proxy/data/analytics?${prevParams.toString()}`, {
              signal: controller.signal,
            });
            if (prevRes.ok) {
              const prevData = await prevRes.json();
              if (prevData.rows) {
                setPreviousRows(prevData.rows);
              }
            }
          } catch {
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные карты');
      } finally {
        setLoading(false);
      }
    }

    loadAnalyticsData();
    return () => controller.abort();
  }, [startDate, endDate]);

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

  const previousRegionCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of previousRows) {
      if (r.region) {
        const canonical = normalizeRegionName(r.region);
        counts[canonical] = (counts[canonical] || 0) + 1;
      }
    }
    return counts;
  }, [previousRows]);

  useEffect(() => {
    if (selectedRegion) {
      setIsPanelOpen(true);
    } else {
      setIsPanelOpen(false);
    }
  }, [selectedRegion]);

  const handleClearSelection = () => {
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setIsPanelOpen(false);
  };

  const handleSelectRegion = (regionName: string) => {
    if (!regionName) {
      handleClearSelection();
      return;
    }
    const canonical = normalizeRegionName(regionName);
    if (selectedRegion && normalizeRegionName(selectedRegion) === canonical) {
      handleClearSelection();
    } else {
      setSelectedRegion(canonical);
      setSelectedDistrict(null);
      setIsPanelOpen(true);
    }
  };

  const handleClosePanel = () => {
    handleClearSelection();
  };

  const totalRespondents = rows.length;
  const previousTotal = previousRows.length;

  const rankedRegions: RankedRegionRow[] = useMemo(() => {
    const list: RankedRegionRow[] = [];
    for (const ruName of Object.keys(REGION_RU_TO_EN)) {
      const count = regionCounts[ruName] || 0;
      const prevCount = previousRegionCounts[ruName] || 0;

      let change: number | null = null;
      let changePercent: string | null = null;
      let changeDir: 'up' | 'down' | 'flat' | null = null;

      if (previousRows.length > 0) {
        change = count - prevCount;
        if (prevCount > 0) {
          const cp = (change / prevCount) * 100;
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

      list.push({
        ruName,
        displayName: ruName.replace(' область', '').replace('г. ', ''),
        count,
        percent,
        percentNum,
        rank: 0,
        change,
        changePercent,
        changeDir,
      });
    }

    list.sort((a, b) => b.count - a.count);
    list.forEach((r, i) => (r.rank = i + 1));

    return list;
  }, [regionCounts, previousRegionCounts, totalRespondents, previousRows.length]);

  const maxCount = rankedRegions[0]?.count || 1;

  const handleRowHover = (ruName: string | null) => {
    setHoveredRegion(ruName);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-primary tracking-tight">
              Интерактивная карта регионов
            </h1>
          </div>
          <p className="text-xs text-secondary">
            География {totalRespondents.toLocaleString('ru-RU')} респондентов базы main_base
            {previousTotal > 0 && (
              <>
                {' • '}
                <span className="text-[11px]">
                  сравнение с предыдущим периодом ({previousTotal.toLocaleString('ru-RU')})
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          {selectedRegion ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] bg-accent/10 border border-accent/30 text-xs font-semibold text-accent">
                <span>Регион: {selectedRegion}</span>
                <button
                  onClick={handleClearSelection}
                  className="hover:opacity-75 cursor-pointer ml-1"
                  title="Снять выбор региона"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-primary border border-border text-xs font-medium transition-colors cursor-pointer"
                title="Вернуться к обзорному виду всей страны"
              >
                <RotateCcw className="w-3.5 h-3.5 text-secondary" />
                <span>Показать всю карту</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-secondary hidden md:inline">
              Выберите область на карте или в таблице справа
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

      <div className="rounded-2xl border border-border/80 bg-surface p-3 shadow-xs">
        <DateFilter
          mode={filterMode}
          onModeChange={setFilterMode}
          currentDate={currentDate}
          onCurrentDateChange={setCurrentDate}
          startDate={startDate}
          endDate={endDate}
          onCustomRangeChange={(s, e) => setDateRange(s, e)}
          weekStartsOn={weekStartsOn}
        />
      </div>

      {error && (
        <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.8fr)] gap-5 items-start">
        <section
          className={`relative min-w-0 overflow-hidden ${
            selectedRegion
              ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] rounded-2xl border border-border/80 bg-surface shadow-xs'
              : ''
          }`}
        >
          <UzbekistanMap
            regionCounts={regionCounts}
            previousRegionCounts={previousRows.length > 0 ? previousRegionCounts : undefined}
            totalRespondents={totalRespondents}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
            onDeselect={handleClearSelection}
            onHoverRegion={handleRowHover}
            hoveredRegion={hoveredRegion}
            embedded={Boolean(selectedRegion)}
          />

          <RegionDetailPanel
            regionName={selectedRegion}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            rows={rows}
            totalCountryRows={totalRespondents}
            isOpen={Boolean(isPanelOpen && selectedRegion)}
            onClose={handleClosePanel}
          />
        </section>

        <section className="flex min-w-0 min-h-full flex-col gap-0 bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[6px] bg-accent/15 text-accent flex items-center justify-center">
                <ListOrdered className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-primary leading-tight">
                  Рейтинг регионов
                </h2>
                <p className="text-[10px] text-secondary leading-tight mt-0.5">
                  Клик — выделить на карте
                </p>
              </div>
            </div>
            <div className="text-[10px] text-secondary tabular-nums">
              {rankedRegions.length} шт.
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/50 text-xs">
            {rankedRegions.map((row) => {
              const isSelected =
                selectedRegion && normalizeRegionName(selectedRegion) === normalizeRegionName(row.ruName);
              const isHovered =
                hoveredRegion && normalizeRegionName(hoveredRegion) === normalizeRegionName(row.ruName);
              const barWidth = maxCount > 0 ? (row.count / maxCount) * 100 : 0;

              let rankBadgeClass = 'bg-surface-2 text-secondary';
              if (row.rank === 1) rankBadgeClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
              else if (row.rank === 2) rankBadgeClass = 'bg-slate-400/15 text-slate-500 dark:text-slate-300';
              else if (row.rank === 3) rankBadgeClass = 'bg-orange-600/15 text-orange-600 dark:text-orange-400';

              return (
                <button
                  key={row.ruName}
                  data-map-ranking-row
                  onClick={() => handleSelectRegion(row.ruName)}
                  onMouseEnter={() => handleRowHover(row.ruName)}
                  onMouseLeave={() => handleRowHover(null)}
                  className={`w-full px-4 py-10 text-left transition-all cursor-pointer flex flex-col justify-center! gap-1.5 ${
                    isSelected
                      ? 'bg-accent/10 border-l-4 border-l-accent'
                      : isHovered
                      ? 'bg-surface-2/70 border-l-4 border-l-accent/50'
                      : 'hover:bg-surface-2/40 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0 font-bold text-[10px] tabular-nums ${rankBadgeClass}`}
                    >
                      {row.rank === 1 && <Trophy className="w-3 h-3" />}
                      {row.rank !== 1 && <span>{row.rank}</span>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`font-semibold truncate leading-tight ${
                          isSelected ? 'text-accent' : 'text-primary'
                        }`}>
                          <MapPin className="w-3 h-3 inline -mt-0.5 mr-1 opacity-70" />
                          {row.displayName}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {row.change !== null && row.changePercent && (
                            <div
                              className={`flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${
                                row.changeDir === 'up'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : row.changeDir === 'down'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-secondary'
                              }`}
                            >
                              {row.changeDir === 'up' ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : row.changeDir === 'down' ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <MinusIcon className="w-3 h-3" />
                              )}
                              <span>{row.changePercent}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold tabular-nums text-[13px] text-primary">
                            {row.count.toLocaleString('ru-RU')}
                          </span>
                          <span className="text-[10px] text-secondary tabular-nums">
                            чел. · {row.percent}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pl-8">
                    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isSelected ? 'bg-accent' : 'bg-indigo-400/80 dark:bg-indigo-500/80'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-border/60 bg-surface-2/50 shrink-0 flex items-center justify-between text-[10px] text-secondary">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>рост</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>спад</span>
              </div>
            </div>
            <div className="tabular-nums">
              Итого: <span className="font-bold text-primary">{totalRespondents.toLocaleString('ru-RU')}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
