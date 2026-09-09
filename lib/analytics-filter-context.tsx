// lib/analytics-filter-context.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnalyticsFilterState {
  selectedRegion: string | null;
  selectedYear: number | null;
  setSelectedRegion: (region: string | null) => void;
  setSelectedYear: (year: number | null) => void;
}

const AnalyticsFilterContext = createContext<AnalyticsFilterState | null>(null);

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  return (
    <AnalyticsFilterContext.Provider
      value={{ selectedRegion, selectedYear, setSelectedRegion, setSelectedYear }}
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
