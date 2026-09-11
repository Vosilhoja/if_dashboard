'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnalyticsFilterProvider } from '@/lib/analytics-filter-context';
import { CommandPalette } from '@/components/CommandPalette';
import { ToastContainer } from '@/components/ui/Toast';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition = {
  duration: 0.18,
  ease: [0.4, 0, 0.2, 1] as const,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AnalyticsFilterProvider>
      <div className="min-h-screen bg-page text-primary flex flex-col lg:flex-row font-sans">
        {/* Unified Sidebar Navigation */}
        <Sidebar />

        {/* Content Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Breadcrumbs />
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="flex-1 flex flex-col max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4 sm:gap-6 overflow-y-auto overflow-x-hidden"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>

        {/* Global Command Palette (Cmd+K) & Toast Notifications */}
        <CommandPalette />
        <ToastContainer />
      </div>
    </AnalyticsFilterProvider>
  );
}
