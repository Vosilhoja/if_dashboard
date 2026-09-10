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
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Breadcrumbs />
          <main className="flex-1 flex flex-col max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6 overflow-y-auto">
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
