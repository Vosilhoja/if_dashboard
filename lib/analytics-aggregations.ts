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
  creationDate?: string;
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
  field: 'education' | 'source' | 'profession'
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

export function aggregateMonthlyDynamics(rows: AnalyticsRow[]): Array<{ month: string; count: number }> {
  const monthly: Record<string, number> = {};
  for (const row of rows) {
    if (!row.creationDate) continue;
    // Format YYYY-MM
    const datePart = row.creationDate.slice(0, 7);
    if (datePart && datePart.length === 7) {
      monthly[datePart] = (monthly[datePart] || 0) + 1;
    }
  }
  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export function aggregateTopCrossCombinations(
  rows: AnalyticsRow[],
  limit = 10
): Array<{ pair: string; count: number }> {
  const pairs: Record<string, number> = {};
  for (const row of rows) {
    const edu = row.education && row.education !== 'Не указано' ? row.education : null;
    const prof = row.profession && row.profession !== 'Не указана' ? row.profession : null;
    if (edu && prof) {
      const key = `${prof} × ${edu}`;
      pairs[key] = (pairs[key] || 0) + 1;
    }
  }
  return Object.entries(pairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pair, count]) => ({ pair, count }));
}
