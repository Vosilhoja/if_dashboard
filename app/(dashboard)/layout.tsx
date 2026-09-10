import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnalyticsFilterProvider } from '@/lib/analytics-filter-context';
import { CommandPalette } from '@/components/CommandPalette';
import { ToastContainer } from '@/components/ui/Toast';
import { AIChatDrawer } from '@/components/AIChatDrawer';

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
          <footer className="border-t border-border/80 py-3 px-4 text-center text-[11px] text-secondary mt-auto bg-surface/40 shrink-0">
            HURMO UZ Analytics Dashboard • Google Spreadsheet API • {new Date().getFullYear()}
          </footer>
        </div>

        {/* Global Command Palette (Cmd+K), Toast Notifications & AI Chat */}
        <CommandPalette />
        <ToastContainer />
        <AIChatDrawer />
      </div>
    </AnalyticsFilterProvider>
  );
}
