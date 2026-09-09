/**
 * Status configuration for HURMO UZ call-center & dashboard
 * Allows easily extending canonical statuses, keywords, and spelling variants.
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
  thresholds: {
    smsMatchPercentage: number; // 90%
  };
}

export const DEFAULT_STATUS_CONFIG: StatusConfigType = {
  linkSent: {
    id: 'link_sent',
    name: 'Ссылка отправлена',
    description: 'Статусы и комментарии, означающие первичную или успешную отправку ссылки',
    phrases: [
      'silka_yuborilgan',
      'silka yuborilgan',
      'silka_yuborildi',
      'silka yuborildi',
      'yubordik',
      'yuborildi',
      'sms yuborildi',
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
    description: 'Статусы и комментарии о повторной отправке ссылки',
    phrases: [
      'povtor silka yuborilgan',
      'povtor silka yuborildi',
      'povtor silka',
      'povtor',
      'повторно',
      'повтор',
      'повторная отправка',
      'qayta yuborildi',
      'qayta silka'
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
