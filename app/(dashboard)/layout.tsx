import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnalyticsFilterProvider } from '@/lib/analytics-filter-context';
import { CommandPalette } from '@/components/CommandPalette';
import { ToastContainer } from '@/components/ui/Toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AnalyticsFilterProvider>
      <div className="min-h-screen bg-page text-primary flex flex-col lg:flex-row font-sans">
        {/* Unified Sidebar Navigation */}
        <Sidebar />

        {/* Content Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Breadcrumbs />
          <main className="flex-1 flex flex-col max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4 sm:gap-6 overflow-y-auto overflow-x-hidden animate-fade-in">
            {children}
          </main>
        </div>

        {/* Global Command Palette (Cmd+K) & Toast Notifications */}
        <CommandPalette />
        <ToastContainer />
      </div>
    </AnalyticsFilterProvider>
  );
}
