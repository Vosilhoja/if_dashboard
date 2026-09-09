// lib/analytics-filter-context.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AgeBin } from './age-utils';

interface AnalyticsFilterState {
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
  resetFilters: () => void;
}

const AnalyticsFilterContext = createContext<AnalyticsFilterState | null>(null);

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
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
    // When region changes, clear district if it doesn't belong or reset
    if (!region) {
      setSelectedDistrict(null);
    }
  };

  const toggleCompareRegion = (region: string) => {
    setSelectedCompareRegions((prev) => {
      if (prev.includes(region)) {
        return prev.filter((r) => r !== region);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), region]; // keep up to 3
      }
      return [...prev, region];
    });
  };

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

  return (
    <AnalyticsFilterContext.Provider
      value={{
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
      }}
    >
      {children}
    </AnalyticsFilterContext.Provider>
  );
}

export function useAnalyticsFilter() {
  const ctx = useContext(AnalyticsFilterContext);
  if (!ctx) {
    throw new Error('useAnalyticsFilter должен использоваться внутри AnalyticsFilterProvider');
  }
  return ctx;
}
