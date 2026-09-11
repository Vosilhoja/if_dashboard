'use client';

/**
 * lib/query-provider.tsx
 * TanStack Query client provider — enables caching, automatic refetch, and shared state.
 * staleTime default: 3 minutes — prevents redundant API calls on page navigation.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 3 minutes — prevents re-fetching on every page switch
        staleTime: 3 * 60 * 1000,
        // Keep data in cache for 5 minutes after component unmounts
        gcTime: 5 * 60 * 1000,
        // Retry failed requests once before showing error
        retry: 1,
        retryDelay: 1000,
        // Don't refetch on window focus in a corporate dashboard context
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create new client
    return makeQueryClient();
  }
  // Browser: reuse client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
