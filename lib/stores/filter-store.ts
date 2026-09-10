/**
 * lib/stores/filter-store.ts
 *
 * Zustand store for global analytics filter state.
 * Replaces the React Context approach with a lightweight, provider-free store.
 * Persists date range to localStorage so filters survive page refresh.
 *
 * Usage:
 *   import { useFilterStore } from '@/lib/stores/filter-store'
 *   const { startDate, endDate, setDateRange } = useFilterStore()
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Returns YYYY-MM-DD for N days ago */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

interface FilterState {
  // Date range
  startDate: string;
  endDate: string;

  // Geographic filter
  selectedRegion: string | null;
  selectedDistrict: string | null;

  // Demographic filters
  selectedGender: string | null;
  selectedAgeGroup: string | null;

  // Actions
  setDateRange: (start: string, end: string) => void;
  setRegion: (region: string | null, district?: string | null) => void;
  setGender: (gender: string | null) => void;
  setAgeGroup: (ageGroup: string | null) => void;
  resetFilters: () => void;
}

const DEFAULT_STATE = {
  startDate: daysAgo(30),
  endDate: daysAgo(0),
  selectedRegion: null,
  selectedDistrict: null,
  selectedGender: null,
  selectedAgeGroup: null,
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setDateRange: (startDate, endDate) => set({ startDate, endDate }),

      setRegion: (selectedRegion, selectedDistrict = null) =>
        set({ selectedRegion, selectedDistrict }),

      setGender: (selectedGender) => set({ selectedGender }),

      setAgeGroup: (selectedAgeGroup) => set({ selectedAgeGroup }),

      resetFilters: () => set(DEFAULT_STATE),
    }),
    {
      name: 'hurmo-analytics-filter',
      // Only persist date range — region/demographic filters reset on page load
      partialize: (state) => ({
        startDate: state.startDate,
        endDate: state.endDate,
      }),
    }
  )
);

// Selector hooks for performance (avoid unnecessary re-renders)
export const useDateRange = () =>
  useFilterStore((s) => ({ startDate: s.startDate, endDate: s.endDate }));

export const useSelectedRegion = () =>
  useFilterStore((s) => s.selectedRegion);

export const useFilterActions = () =>
  useFilterStore((s) => ({
    setDateRange: s.setDateRange,
    setRegion: s.setRegion,
    setGender: s.setGender,
    setAgeGroup: s.setAgeGroup,
    resetFilters: s.resetFilters,
  }));
