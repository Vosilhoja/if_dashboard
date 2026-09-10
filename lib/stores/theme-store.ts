/**
 * lib/stores/theme-store.ts
 *
 * Zustand store for dark/light theme management.
 * Persists preference to localStorage.
 *
 * Usage:
 *   import { useThemeStore } from '@/lib/stores/theme-store'
 *   const { theme, toggleTheme } = useThemeStore()
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',

      setTheme: (theme) => {
        const resolved =
          theme === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : theme;

        // Apply to DOM
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', resolved === 'dark');
        }

        set({ theme, resolvedTheme: resolved });
      },

      toggleTheme: () => {
        const current = get().resolvedTheme;
        get().setTheme(current === 'dark' ? 'light' : 'dark');
      },
    }),
    {
      name: 'hurmo-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
