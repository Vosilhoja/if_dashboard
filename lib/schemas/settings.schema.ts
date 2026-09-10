/**
 * lib/schemas/settings.schema.ts
 *
 * Zod schemas for the Settings page form validation.
 * Used with React Hook Form (@hookform/resolvers/zod).
 *
 * Usage:
 *   import { SettingsFormSchema } from '@/lib/schemas/settings.schema'
 *   const form = useForm<SettingsFormValues>({
 *     resolver: zodResolver(SettingsFormSchema)
 *   })
 */
import { z } from 'zod';

// ── Anomaly thresholds ─────────────────────────────────────────────────────
export const AnomalyThresholdsSchema = z.object({
  callsDropPercent: z
    .number()
    .min(5, 'Минимальный порог: 5%')
    .max(90, 'Максимальный порог: 90%')
    .default(30),
  declinedSpikePercent: z
    .number()
    .min(5, 'Минимальный порог: 5%')
    .max(90, 'Максимальный порог: 90%')
    .default(50),
  smsDeliveryDropPercent: z
    .number()
    .min(5, 'Минимальный порог: 5%')
    .max(90, 'Максимальный порог: 90%')
    .default(40),
});

// ── Google Sheets links ────────────────────────────────────────────────────
export const SheetsLinksSchema = z.object({
  main: z.string().url('Введите корректный URL').optional().or(z.literal('')),
  numbers: z.string().url('Введите корректный URL').optional().or(z.literal('')),
  eskiz: z.string().url('Введите корректный URL').optional().or(z.literal('')),
  not_completed: z.string().url('Введите корректный URL').optional().or(z.literal('')),
});

// ── Full settings form ─────────────────────────────────────────────────────
export const SettingsFormSchema = z.object({
  anomalyThresholds: AnomalyThresholdsSchema,
  sheetsLinks: SheetsLinksSchema,
  telegramChatId: z
    .string()
    .regex(/^-?\d+$/, 'Введите числовой chat_id')
    .optional()
    .or(z.literal('')),
  cacheTtlSeconds: z
    .number()
    .min(60, 'Минимум 60 секунд')
    .max(3600, 'Максимум 1 час')
    .default(300),
});

export type SettingsFormValues = z.infer<typeof SettingsFormSchema>;
export type AnomalyThresholds = z.infer<typeof AnomalyThresholdsSchema>;
