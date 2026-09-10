'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  Users,
  MapPin,
  GraduationCap,
  Calendar,
  ExternalLink,
  ChevronRight,
  Filter,
  ArrowRight,
} from 'lucide-react';
import {
  AnalyticsRow,
  aggregateByGender,
  aggregateByAge,
  aggregateByCategory,
} from '@/lib/analytics-aggregations';
import { DATA_PALETTE, GENDER_COLORS } from '@/lib/chart-colors';
import { normalizeRegionName } from '@/lib/region-name-map';

interface RegionDetailPanelProps {
  regionName: string | null;
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
  rows: AnalyticsRow[];
  totalCountryRows: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RegionDetailPanel: React.FC<RegionDetailPanelProps> = ({
  regionName,
  selectedDistrict,
  onSelectDistrict,
  rows,
  totalCountryRows,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !regionName) return null;

  // Filter rows belonging to this region
  const regionCanonical = normalizeRegionName(regionName);
  const regionRows = rows.filter(
    (r) => normalizeRegionName(r.region) === regionCanonical
  );

  // If a district is selected inside this region, further drill down
  const activeRows = selectedDistrict
    ? regionRows.filter((r) => r.district === selectedDistrict)
    : regionRows;

  // Compute aggregations using lib/analytics-aggregations
  const genderStats = aggregateByGender(activeRows);
  const ageStats = aggregateByAge(activeRows);
  const educationStats = aggregateByCategory(activeRows, 'education');

  // Compute districts in this region
  const districtCounts: Record<string, number> = {};
  for (const r of regionRows) {
    const d = r.district || 'Не указан';
    districtCounts[d] = (districtCounts[d] || 0) + 1;
  }

  const sortedDistricts = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]);

  const regionTotal = regionRows.length;
  const activeTotal = activeRows.length;
  const percentOfCountry =
    totalCountryRows > 0 ? ((regionTotal / totalCountryRows) * 100).toFixed(1) : '0';

  const totalGender = genderStats.Мужской + genderStats.Женский || 1;
  const malePercent = Math.round((genderStats.Мужской / totalGender) * 100);
  const femalePercent = 100 - malePercent;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
        onClick={onClose}
      />

      {/* Slide-over panel (Right drawer on desktop, bottom sheet on mobile) */}
      <aside
        className={`fixed z-50 bg-surface border-border flex flex-col shadow-2xl transition-all duration-200
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-[16px] border-t lg:rounded-none lg:border-t-0
          lg:inset-y-0 lg:right-0 lg:left-auto lg:w-96 lg:border-l lg:max-h-none`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-start justify-between gap-3 bg-surface sticky top-0 z-10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-accent font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>Региональный срез</span>
            </div>
            <h2 className="text-base font-bold text-primary tracking-tight">
              {regionName}
            </h2>
            {selectedDistrict && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/10 text-accent text-[11px] font-medium mt-1">
                <span>Район: {selectedDistrict}</span>
                <button
                  onClick={() => onSelectDistrict(null)}
                  className="hover:opacity-75 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] hover:bg-surface-2 text-secondary hover:text-primary transition-colors cursor-pointer"
            aria-label="Закрыть панель"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Key Numbers */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-[6px] bg-neutral-50 dark:bg-surface-2/60 border border-border/60">
              <div className="text-[11px] text-secondary">Респондентов</div>
              <div className="text-xl font-bold text-primary tabular-nums mt-0.5">
                {activeTotal.toLocaleString('ru-RU')}
              </div>
              <div className="text-[10px] text-secondary mt-0.5">
                {percentOfCountry}% от всей страны
              </div>
            </div>

            <div className="p-3 rounded-[6px] bg-neutral-50 dark:bg-surface-2/60 border border-border/60">
              <div className="text-[11px] text-secondary">Средний возраст</div>
              <div className="text-xl font-bold text-primary tabular-nums mt-0.5">
                {ageStats.averageAge !== null ? `${ageStats.averageAge} лет` : '—'}
              </div>
              <div className="text-[10px] text-secondary mt-0.5">
                {sortedDistricts.length} районов в области
              </div>
            </div>
          </div>

          {/* Gender Ratio */}
          <div className="space-y-2 p-3 rounded-[6px] bg-surface border border-border/60">
            <div className="flex items-center justify-between text-xs font-semibold text-primary">
              <span>Соотношение полов</span>
              <span className="text-[11px] text-secondary tabular-nums">
                {genderStats.Мужской} М / {genderStats.Женский} Ж
              </span>
            </div>

            {/* Split Bar */}
            <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-surface-2">
              <div
                style={{ width: `${malePercent}%`, backgroundColor: GENDER_COLORS.Мужской }}
                title={`Мужской: ${malePercent}%`}
              />
              <div
                style={{ width: `${femalePercent}%`, backgroundColor: GENDER_COLORS.Женский }}
                title={`Женский: ${femalePercent}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Мужчины: {malePercent}%
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Женщины: {femalePercent}%
              </span>
            </div>
          </div>

          {/* Age Bins */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-primary">Возрастные группы</h3>
            <div className="space-y-1.5">
              {Object.entries(ageStats.bins).map(([bin, counts]) => {
                const totalBin = counts.Мужской + counts.Женский;
                const binPercent =
                  activeTotal > 0 ? Math.round((totalBin / activeTotal) * 100) : 0;
                return (
                  <div key={bin} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-secondary">{bin}</span>
                      <span className="font-semibold text-primary tabular-nums">
                        {totalBin} ({binPercent}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${binPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Education Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <GraduationCap className="w-3.5 h-3.5 text-accent" />
              <span>Образование</span>
            </div>
            <div className="space-y-1">
              {Object.entries(educationStats)
                .slice(0, 4)
                .map(([edu, count]) => {
                  const percent =
                    activeTotal > 0 ? Math.round((count / activeTotal) * 100) : 0;
                  return (
                    <div
                      key={edu}
                      className="flex items-center justify-between py-1 border-b border-border/40 text-[11px]"
                    >
                      <span className="text-secondary truncate max-w-[200px]">{edu}</span>
                      <span className="font-medium text-primary tabular-nums">
                        {count} ({percent}%)
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Districts List (Drill-Down) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                <span>Районы и города ({sortedDistricts.length})</span>
              </div>
              {selectedDistrict && (
                <button
                  onClick={() => onSelectDistrict(null)}
                  className="text-[10px] text-accent hover:underline font-medium cursor-pointer"
                >
                  Сбросить район
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {sortedDistricts.map(([district, count]) => {
                const isSelected = selectedDistrict === district;
                return (
                  <button
                    key={district}
                    onClick={() => onSelectDistrict(isSelected ? null : district)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-left transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-accent text-white font-medium'
                        : 'bg-surface-2/60 hover:bg-surface-2 text-primary'
                    }`}
                  >
                    <span className="truncate">{district}</span>
                    <span
                      className={`font-semibold tabular-nums ml-2 text-[11px] ${
                        isSelected ? 'text-white' : 'text-secondary'
                      }`}
                    >
                      {count.toLocaleString('ru-RU')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with BI Analytics link */}
        <div className="p-3 border-t border-border bg-surface flex items-center justify-between gap-2">
          <Link
            href="/analytics"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] bg-accent text-white hover:opacity-90 font-medium text-xs transition-colors shadow-xs"
          >
            <span>Открыть в BI-аналитике</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    </>
  );
};
