export interface MetricValue {
  value: number | string;
  subtext?: string;
  ratio?: number;
  isAlert?: boolean;
  statusText?: string;
  error?: string;
}

export interface DashboardMetrics {
  callsCount: MetricValue;
  smsSentVerification: MetricValue;
  registeredMainBase: MetricValue;
  registeredFromSupport: MetricValue;
  registeredAfterRepeat: MetricValue;
  period: {
    startDate: string;
    endDate: string;
  };
  totalRows: {
    main: number;
    numbers: number;
    eskiz: number;
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
