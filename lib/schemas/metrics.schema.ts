/**
 * lib/schemas/metrics.schema.ts
 *
 * Zod schemas for DashboardMetrics API response validation.
 * Use these at API boundaries to catch malformed Google Sheets data early.
 *
 * Usage:
 *   import { DashboardMetricsSchema } from '@/lib/schemas/metrics.schema'
 *   const metrics = DashboardMetricsSchema.parse(await res.json())
 */
import { z } from 'zod';

// ── Primitive metric value ──────────────────────────────────────────────────
export const MetricValueSchema = z.object({
  value: z.union([z.number(), z.string()]),
  subtext: z.string().optional(),
  ratio: z.number().optional(),
  isAlert: z.boolean().optional(),
  statusText: z.string().optional(),
  error: z.string().optional(),
});

// ── Phone diagnostics ──────────────────────────────────────────────────────
export const PhoneDiagnosticsSchema = z.object({
  corrupted: z.number(),
  truncated: z.number(),
  invalid: z.number(),
  foreign: z.number(),
});

// ── Anomaly data ───────────────────────────────────────────────────────────
export const AnomalyItemSchema = z.object({
  current: z.number(),
  baseline4WeeksAvg: z.number(),
  deltaPercent: z.number(),
  isAnomaly: z.boolean(),
  direction: z.enum(['up', 'down', 'normal']),
});

// ── Full dashboard metrics ─────────────────────────────────────────────────
export const DashboardMetricsSchema = z.object({
  callsCount: MetricValueSchema,
  smsSentVerification: MetricValueSchema,
  registeredMainBase: MetricValueSchema,
  registeredFromSupport: MetricValueSchema,
  registeredAfterRepeat: MetricValueSchema,
  declinedCount: MetricValueSchema,
  alreadyRegisteredCount: MetricValueSchema,
  wrongPersonCount: MetricValueSchema,
  notCompletedCount: MetricValueSchema.optional(),
  phoneDiagnostics: PhoneDiagnosticsSchema,
  period: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  }),
  totalRows: z.object({
    main: z.number(),
    numbers: z.number(),
    eskiz: z.number(),
    not_completed: z.number().optional(),
  }),
  anomalyData: z
    .object({
      callsAnomaly: AnomalyItemSchema,
      declinedAnomaly: AnomalyItemSchema,
    })
    .optional(),
  cachedAt: z.string(),
});

// ── Paginated sheet response ───────────────────────────────────────────────
export const SheetPaginatedResponseSchema = z.object({
  type: z.string(),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
  headers: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.string())),
  cachedAt: z.string(),
});

// ── Type inference helpers ─────────────────────────────────────────────────
export type MetricValueInput = z.input<typeof MetricValueSchema>;
export type DashboardMetricsInput = z.input<typeof DashboardMetricsSchema>;
export type SheetPaginatedResponseInput = z.input<typeof SheetPaginatedResponseSchema>;
