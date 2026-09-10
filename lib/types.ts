export interface MetricValue {
  value: number | string;
  subtext?: string;
  ratio?: number;
  isAlert?: boolean;
  statusText?: string;
  error?: string;
}

export interface NotCompletedRow {
  'Статус': string;
  'Result id': string;
  'Дата создания': string;
  'Creation time': string;
  'Start date': string;
  'Start time': string;
  'Язык': string;
  'ID пользователя': string;
  'Phone': string;
  'Nickname': string;
  'Last activity': string;
}

export interface DashboardMetrics {
  callsCount: MetricValue;
  smsSentVerification: MetricValue;
  registeredMainBase: MetricValue;
  registeredFromSupport: MetricValue;
  registeredAfterRepeat: MetricValue;
  declinedCount: MetricValue;           // Отказы (13k+ записей)
  alreadyRegisteredCount: MetricValue;  // Уже зарегистрирован через бот
  wrongPersonCount: MetricValue;        // Не тот человек / номер
  notCompletedCount: MetricValue;       // 9-я метрика: не завершили регистрацию за период
  phoneDiagnostics: {                   // Диагностика номеров
    corrupted: number;
    truncated: number;
    invalid: number;
    foreign: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  totalRows: {
    main: number;
    numbers: number;
    eskiz: number;
    not_completed?: number;
  };
  anomalyData?: {
    callsAnomaly: {
      current: number;
      baseline4WeeksAvg: number;
      deltaPercent: number;
      isAnomaly: boolean;
      direction: 'up' | 'down' | 'normal';
    };
    declinedAnomaly: {
      current: number;
      baseline4WeeksAvg: number;
      deltaPercent: number;
      isAnomaly: boolean;
      direction: 'up' | 'down' | 'normal';
    };
  };
  cachedAt: string;
}

export interface SheetPaginatedResponse {
  type: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  headers: string[];
  rows: Record<string, string>[];
  cachedAt: string;
}
