// lib/analytics-aggregations.ts
import { binAge, AgeBin } from './age-utils';

export interface AnalyticsRow {
  region: string;
  district: string;
  gender: 'Мужской' | 'Женский' | null;
  age: number | null;
  education: string;
  profession: string;
  source: string;
}

export function aggregateByGender(rows: AnalyticsRow[]): { Мужской: number; Женский: number } {
  const result = { Мужской: 0, Женский: 0 };
  for (const row of rows) {
    if (row.gender === 'Мужской' || row.gender === 'Женский') {
      result[row.gender]++;
    }
  }
  return result;
}

export function aggregateByAge(rows: AnalyticsRow[]): {
  bins: Record<AgeBin, { Мужской: number; Женский: number }>;
  averageAge: number | null;
} {
  const bins: Record<AgeBin, { Мужской: number; Женский: number }> = {
    'До 18': { Мужской: 0, Женский: 0 },
    '18-24': { Мужской: 0, Женский: 0 },
    '25-34': { Мужской: 0, Женский: 0 },
    '35-49': { Мужской: 0, Женский: 0 },
    '50+': { Мужской: 0, Женский: 0 },
  };

  let sum = 0;
  let count = 0;

  for (const row of rows) {
    if (row.age !== null && !isNaN(row.age) && row.age > 0 && row.age < 120) {
      sum += row.age;
      count++;
      const bin = binAge(row.age);
      if (row.gender === 'Мужской' || row.gender === 'Женский') {
        bins[bin][row.gender]++;
      }
    }
  }

  return {
    bins,
    averageAge: count > 0 ? +(sum / count).toFixed(1) : null,
  };
}

export function aggregateByCategory(
  rows: AnalyticsRow[],
  field: 'education' | 'source'
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = row[field] || 'Не указано';
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

export function aggregateByRegionHierarchy(rows: AnalyticsRow[]): Record<
  string,
  {
    Мужской: number;
    Женский: number;
    district: Record<string, { Мужской: number; Женский: number }>;
  }
> {
  const byRegionGender: Record<
    string,
    {
      Мужской: number;
      Женский: number;
      district: Record<string, { Мужской: number; Женский: number }>;
    }
  > = {};

  for (const row of rows) {
    const region = row.region || 'Не указан';
    const district = row.district || 'Не указан';

    if (!byRegionGender[region]) {
      byRegionGender[region] = { Мужской: 0, Женский: 0, district: {} };
    }
    if (row.gender) {
      byRegionGender[region][row.gender]++;
    }

    if (!byRegionGender[region].district[district]) {
      byRegionGender[region].district[district] = { Мужской: 0, Женский: 0 };
    }
    if (row.gender) {
      byRegionGender[region].district[district][row.gender]++;
    }
  }

  return byRegionGender;
}
