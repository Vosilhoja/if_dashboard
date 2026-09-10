/**
 * components/index.ts — Master barrel for all dashboard components.
 *
 * Organized by domain. Use domain-specific barrels for clarity:
 *   import { Sidebar } from '@/components/layout'
 *   import { MetricCard } from '@/components/metrics'
 *   import { DataTable } from '@/components/data-table'
 *   import { AIChatDrawer } from '@/components/ai'
 *
 * Or use this master barrel for quick imports:
 *   import { Sidebar, MetricCard, DataTable } from '@/components'
 */

// Layout & Navigation
export { Sidebar } from '@/components/Sidebar';
export { Breadcrumbs } from '@/components/Breadcrumbs';
export { Header } from '@/components/Header';

// Metrics & KPI
export { MetricCard } from '@/components/MetricCard';
export { MetricsGrid } from '@/components/MetricsGrid';
export { AnomalyWidget } from '@/components/AnomalyWidget';
export { FunnelWidget } from '@/components/FunnelWidget';

// AI
export { AIChatDrawer, openAIChat } from '@/components/AIChatDrawer';
export { AIInsightsWidget } from '@/components/AIInsightsWidget';

// Data Table
export { DataTable } from '@/components/DataTable';

// Filters & Date
export { DateFilter } from '@/components/DateFilter';

// UI Primitives
export { Skeleton } from '@/components/ui/Skeleton';
export { showToast, ToastContainer } from '@/components/ui/Toast';

// Utils
export { CommandPalette } from '@/components/CommandPalette';
export { RawDataTabs } from '@/components/RawDataTabs';
