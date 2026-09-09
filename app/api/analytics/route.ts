// app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { fetchAllRowsForSheet } from '@/lib/google-sheets';
import { binAge } from '@/lib/age-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mainRows = await fetchAllRowsForSheet('main');

    const byRegionGender: Record<
      string,
      {
        Мужской: number;
        Женский: number;
        district: Record<string, { Мужской: number; Женский: number }>;
      }
    > = {};
    const genderCount = { Мужской: 0, Женский: 0 };
    const educationCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    const ageBins = {
      'До 18': { Мужской: 0, Женский: 0 },
      '18-24': { Мужской: 0, Женский: 0 },
      '25-34': { Мужской: 0, Женский: 0 },
      '35-49': { Мужской: 0, Женский: 0 },
      '50+': { Мужской: 0, Женский: 0 },
    };
    let ageSum = 0;
    let ageCount = 0;

    const emptyPhone = mainRows.filter((r) => !r['Phone']).length;
    const emptyRegion = mainRows.filter((r) => !r['Регион']).length;
    const emptyAge = mainRows.filter((r) => !r['Возраст']).length;
    const emptyEducation = mainRows.filter((r) => !r['Оброзование']).length;
    const emptyProfession = mainRows.filter((r) => !r['Профессия']).length;

    for (const row of mainRows) {
      const region = row['Регион'] || 'Не указан';
      const district = row['Район'] || row['Город'] || 'Не указан';
      const gender =
        row['Пол'] === 'Мужской' || row['Пол'] === 'Женский' ? row['Пол'] : null;
      const education = row['Оброзование'] || 'Не указано';
      const source = row['Откуда пришёл пользователь'] || 'Не указано';
      const ageRaw = parseInt(row['Возраст'] || '', 10);

      if (!byRegionGender[region]) {
        byRegionGender[region] = { Мужской: 0, Женский: 0, district: {} };
      }
      if (gender) byRegionGender[region][gender]++;
      if (!byRegionGender[region].district[district]) {
        byRegionGender[region].district[district] = { Мужской: 0, Женский: 0 };
      }
      if (gender) byRegionGender[region].district[district][gender]++;

      if (gender) genderCount[gender]++;

      educationCount[education] = (educationCount[education] || 0) + 1;
      sourceCount[source] = (sourceCount[source] || 0) + 1;

      if (!isNaN(ageRaw) && ageRaw > 0 && ageRaw < 120) {
        ageSum += ageRaw;
        ageCount++;
        const bin = binAge(ageRaw);
        if (gender) ageBins[bin][gender]++;
      }
    }

    return NextResponse.json({
      byRegionGender,
      genderCount,
      educationCount,
      sourceCount,
      ageBins,
      averageAge: ageCount > 0 ? +(ageSum / ageCount).toFixed(1) : null,
      dataQuality: {
        emptyPhone,
        emptyRegion,
        emptyAge,
        emptyEducation,
        emptyProfession,
        totalRows: mainRows.length,
      },
      cachedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
