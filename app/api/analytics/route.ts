// app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { fetchAllRowsForSheet } from '@/lib/google-sheets';
import {
  AnalyticsRow,
  aggregateByGender,
  aggregateByAge,
  aggregateByCategory,
  aggregateByRegionHierarchy,
} from '@/lib/analytics-aggregations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mainRows = await fetchAllRowsForSheet('main');

    const rows: AnalyticsRow[] = new Array(mainRows.length);
    let emptyPhone = 0;
    let emptyRegion = 0;
    let emptyAge = 0;
    let emptyEducation = 0;
    let emptyProfession = 0;

    for (let i = 0; i < mainRows.length; i++) {
      const r = mainRows[i];
      const phone = r['Phone'];
      const region = r['Регион'] || 'Не указан';
      const district = r['Район'] || r['Город'] || 'Не указан';
      const genderRaw = r['Пол'];
      const gender = genderRaw === 'Мужской' || genderRaw === 'Женский' ? genderRaw : null;
      const education = r['Оброзование'] || 'Не указано';
      const profession = r['Профессия'] || 'Не указана';
      const source = r['Откуда пришёл пользователь'] || 'Не указано';
      const rawAgeStr = r['Возраст'] || '';
      const ageNum = parseInt(rawAgeStr, 10);
      const age = !isNaN(ageNum) && ageNum > 0 && ageNum < 120 ? ageNum : null;

      if (!phone) emptyPhone++;
      if (!r['Регион']) emptyRegion++;
      if (!r['Возраст']) emptyAge++;
      if (!r['Оброзование']) emptyEducation++;
      if (!r['Профессия']) emptyProfession++;

      rows[i] = {
        region,
        district,
        gender,
        age,
        education,
        profession,
        source,
      };
    }

    const genderCount = aggregateByGender(rows);
    const { bins: ageBins, averageAge } = aggregateByAge(rows);
    const educationCount = aggregateByCategory(rows, 'education');
    const sourceCount = aggregateByCategory(rows, 'source');
    const byRegionGender = aggregateByRegionHierarchy(rows);

    return NextResponse.json({
      rows,
      byRegionGender,
      genderCount,
      educationCount,
      sourceCount,
      ageBins,
      averageAge,
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
