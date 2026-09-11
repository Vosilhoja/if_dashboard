// lib/analytics-filter-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { formatDateToISO } from './date-utils';
import { AgeBin } from './age-utils';
import { FilterMode } from '@/components/DateFilter';

interface AnalyticsFilterState {
  // Date period state (Unified across all pages)
  startDate: string;
  endDate: string;
  filterMode: FilterMode;
  currentDate: Date;
  weekStartsOn: 0 | 1; // 1 = Monday, 0 = Sunday

  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  setFilterMode: (m: FilterMode) => void;
  setCurrentDate: (d: Date) => void;
  setDateRange: (start: string, end: string, mode?: FilterMode, date?: Date) => void;
  setWeekStartsOn: (w: 0 | 1) => void;

  // Region and category slice state
  selectedRegion: string | null;
  selectedDistrict: string | null;
  selectedGender: 'Мужской' | 'Женский' | null;
  selectedEducation: string | null;
  selectedProfession: string | null;
  selectedAgeBin: AgeBin | null;
  selectedSource: string | null;
  selectedCompareRegions: string[];

  setSelectedRegion: (region: string | null) => void;
  setSelectedDistrict: (district: string | null) => void;
  setSelectedGender: (gender: 'Мужской' | 'Женский' | null) => void;
  setSelectedEducation: (education: string | null) => void;
  setSelectedProfession: (profession: string | null) => void;
  setSelectedAgeBin: (bin: AgeBin | null) => void;
  setSelectedSource: (source: string | null) => void;
  toggleCompareRegion: (region: string) => void;

  // Reset actions
  resetFilters: () => void;
  resetAllFilters: () => void;
  hasActiveFilters: boolean;
}

const AnalyticsFilterContext = createContext<AnalyticsFilterState | null>(null);

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  // Week start setting (1 = Monday by default, configurable in Settings)
  const [weekStartsOn, setWeekStartsOnState] = useState<0 | 1>(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWeekStart = localStorage.getItem('hurmo_week_starts_on');
      if (savedWeekStart === '0' || savedWeekStart === '1') {
        setWeekStartsOnState(parseInt(savedWeekStart, 10) as 0 | 1);
      }
    }
  }, []);

  const setWeekStartsOn = (w: 0 | 1) => {
    setWeekStartsOnState(w);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_week_starts_on', String(w));
    }
  };

  // Date range defaults to current week
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>('week');

  const defaultStart = formatDateToISO(startOfWeek(new Date(), { weekStartsOn }));
  const defaultEnd = formatDateToISO(endOfWeek(new Date(), { weekStartsOn }));

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  // Demographic / Regional slices
  const [selectedRegion, setSelectedRegionState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<'Мужской' | 'Женский' | null>(null);
  const [selectedEducation, setSelectedEducation] = useState<string | null>(null);
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [selectedAgeBin, setSelectedAgeBin] = useState<AgeBin | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedCompareRegions, setSelectedCompareRegions] = useState<string[]>([]);

  const setSelectedRegion = (region: string | null) => {
    setSelectedRegionState(region);
    if (!region) {
      setSelectedDistrict(null);
    }
  };

  const setDateRange = (start: string, end: string, mode?: FilterMode, date?: Date) => {
    setStartDate(start);
    setEndDate(end);
    if (mode) setFilterMode(mode);
    if (date) setCurrentDate(date);
  };

  const toggleCompareRegion = (region: string) => {
    setSelectedCompareRegions((prev) => {
      if (prev.includes(region)) {
        return prev.filter((r) => r !== region);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), region];
      }
      return [...prev, region];
    });
  };

  // Reset category and region filters
  const resetFilters = () => {
    setSelectedRegionState(null);
    setSelectedDistrict(null);
    setSelectedGender(null);
    setSelectedEducation(null);
    setSelectedProfession(null);
    setSelectedAgeBin(null);
    setSelectedSource(null);
    setSelectedCompareRegions([]);
  };

  // Reset ALL filters including date range back to current week
  const resetAllFilters = () => {
    resetFilters();
    const now = new Date();
    setCurrentDate(now);
    setFilterMode('week');
    setStartDate(formatDateToISO(startOfWeek(now, { weekStartsOn })));
    setEndDate(formatDateToISO(endOfWeek(now, { weekStartsOn })));
  };

  const hasActiveFilters = Boolean(
    selectedRegion ||
      selectedDistrict ||
      selectedGender ||
      selectedEducation ||
      selectedProfession ||
      selectedAgeBin ||
      selectedSource ||
      selectedCompareRegions.length > 0 ||
      filterMode === 'alltime' ||
      startDate !== defaultStart ||
      endDate !== defaultEnd
  );

  return (
    <AnalyticsFilterContext.Provider
      value={{
        startDate,
        endDate,
        filterMode,
        currentDate,
        weekStartsOn,
        setStartDate,
        setEndDate,
        setFilterMode,
        setCurrentDate,
        setDateRange,
        setWeekStartsOn,
        selectedRegion,
        selectedDistrict,
        selectedGender,
        selectedEducation,
        selectedProfession,
        selectedAgeBin,
        selectedSource,
        selectedCompareRegions,
        setSelectedRegion,
        setSelectedDistrict,
        setSelectedGender,
        setSelectedEducation,
        setSelectedProfession,
        setSelectedAgeBin,
        setSelectedSource,
        toggleCompareRegion,
        resetFilters,
        resetAllFilters,
        hasActiveFilters,
      }}
    >
      {children}
    </AnalyticsFilterContext.Provider>
  );
}

export function useAnalyticsFilter() {
  const ctx = useContext(AnalyticsFilterContext);
  if (!ctx) {
    throw new Error('useAnalyticsFilter must be used within an AnalyticsFilterProvider');
  }
  return ctx;
}
