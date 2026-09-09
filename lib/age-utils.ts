// lib/age-utils.ts
export type AgeBin = 'До 18' | '18-24' | '25-34' | '35-49' | '50+';

export function binAge(age: number): AgeBin {
  if (age < 18) return 'До 18';
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 49) return '35-49';
  return '50+';
}
