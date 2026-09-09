/**
 * Status configuration for HURMO UZ call-center & dashboard
 * Based on real data analysis from 59,873 rows of the 'numbers' table.
 */

export interface StatusCategoryConfig {
  id: string;
  name: string;
  description: string;
  // Exact or normalized regex match phrases
  phrases: string[];
  // Status codes if recorded as numbers
  codes?: string[];
  // Max Levenshtein distance for fuzzy matching
  maxDistance?: number;
}

export interface StatusConfigType {
  linkSent: StatusCategoryConfig;
  repeatSent: StatusCategoryConfig;
  declined: StatusCategoryConfig;
  thresholds: {
    smsMatchPercentage: number; // 90%
  };
}

export const DEFAULT_STATUS_CONFIG: StatusConfigType = {
  linkSent: {
    id: 'link_sent',
    name: 'Ссылка отправлена',
    description: 'Статусы и комментарии, означающие первичную или успешную отправку ссылки (6 344+ записей в данных)',
    phrases: [
      'silka yuborildi',
      'silka_yuborildi',
      'silka yuborilgan',
      'silka_yuborilgan',
      'yubordik',
      'yuborildi',
      'sms yuborildi',
      'силка юборилди',
      'link sent',
      'отправлена ссылка',
      'ссылка отправлена',
      'отправили ссылку'
    ],
    codes: [],
    maxDistance: 2
  },
  repeatSent: {
    id: 'repeat_sent',
    name: 'Повторная отправка ссылки',
    description: 'Статусы и комментарии о повторной отправке ссылки (466+ записей в данных)',
    phrases: [
      'povtor silka yuborildi',
      'povtor silka',
      'povtor silka yuborilgan',
      'povtor',
      'повтор силка юборилди',
      'повтор силка',
      'повторно',
      'повтор',
      'повторная отправка',
      'qayta yuborildi',
      'qayta silka yuborildi',
      'qayta silka'
    ],
    codes: [],
    maxDistance: 2
  },
  declined: {
    id: 'declined',
    name: 'Отказ',
    description: 'Отказы респондентов, отсутствие времени, нежелание участвовать (14 001+ записей в данных)',
    phrases: [
      'otkaz',
      'отказ',
      'otkaz qildi',
      'otlaz',
      'otkaxz',
      'foydalanmasligini aytdi',
      'foydalanmasligini',
      'vaqti yo\'q',
      'vaqti yo`q',
      'vaqti yo;q',
      'вакти йук',
      'bezovta qilmasligimizni aytdi',
      'noma`lum silka xohlamadi shubxali',
      'botni shubhali deb o\'ylagan',
      'botga ishonmagani uchun kirmagan',
      'oila a\'zolari ruxsat bermagan',
      'turmush o\'rtog\'i ruxsat bermagan',
      'silka orqali kirishni xohlamadi'
    ],
    codes: [],
    maxDistance: 2
  },
  thresholds: {
    smsMatchPercentage: 0.9 // 90% threshold for green / red indicator
  }
};

// Backwards compatibility alias
export const STATUS_CONFIG = DEFAULT_STATUS_CONFIG;
