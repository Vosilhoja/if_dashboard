// lib/analytics-filter-context.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnalyticsFilterState {
  selectedRegion: string | null;
  selectedGender: 'Мужской' | 'Женский' | null;
  selectedEducation: string | null;
  setSelectedRegion: (region: string | null) => void;
  setSelectedGender: (gender: 'Мужской' | 'Женский' | null) => void;
  setSelectedEducation: (education: string | null) => void;
  resetFilters: () => void;
}

const AnalyticsFilterContext = createContext<AnalyticsFilterState | null>(null);

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<'Мужской' | 'Женский' | null>(null);
  const [selectedEducation, setSelectedEducation] = useState<string | null>(null);

  const resetFilters = () => {
    setSelectedRegion(null);
    setSelectedGender(null);
    setSelectedEducation(null);
  };

  return (
    <AnalyticsFilterContext.Provider
      value={{
        selectedRegion,
        selectedGender,
        selectedEducation,
        setSelectedRegion,
        setSelectedGender,
        setSelectedEducation,
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
