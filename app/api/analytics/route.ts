// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRowsForSheet, clearSheetCache } from '@/lib/google-sheets';
import {
  AnalyticsRow,
  aggregateByGender,
  aggregateByAge,
  aggregateByCategory,
  aggregateByRegionHierarchy,
  aggregateMonthlyDynamics,
  aggregateTopCrossCombinations,
} from '@/lib/analytics-aggregations';
import { formatDateToISO } from '@/lib/date-utils';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const refresh = searchParams.get('refresh') === 'true';

    if (refresh) {
      clearSheetCache();
    }

    const mainRows = await fetchAllRowsForSheet('main', refresh);

    const allRows: AnalyticsRow[] = new Array(mainRows.length);
    let emptyPhone = 0;
    let emptyRegion = 0;
    let emptyAge = 0;
    let emptyEducation = 0;
    let emptyProfession = 0;

    // Rolling windows from today
    const today = new Date();
    const todayISO = formatDateToISO(today);
    const date7DaysAgo = formatDateToISO(subDays(today, 7));
    const date30DaysAgo = formatDateToISO(subDays(today, 30));

    let rolling7DaysCount = 0;
    let rolling30DaysCount = 0;

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

      // Extract creation date for dynamics and BI period filtering
      let creationDate = r['Дата создания'] || r['date'] || r['Дата'] || '';
      if (creationDate) {
        // Normalize DD.MM.YYYY to YYYY-MM-DD
        const parts = creationDate.split(/[T\s]/)[0].split(/[./-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            creationDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else {
            creationDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      if (!phone) emptyPhone++;
      if (!r['Регион']) emptyRegion++;
      if (!r['Возраст']) emptyAge++;
      if (!r['Оброзование']) emptyEducation++;
      if (!r['Профессия']) emptyProfession++;

      // Check rolling window
      if (creationDate) {
        if (creationDate >= date7DaysAgo && creationDate <= todayISO) {
          rolling7DaysCount++;
        }
        if (creationDate >= date30DaysAgo && creationDate <= todayISO) {
          rolling30DaysCount++;
        }
      }

      allRows[i] = {
        region,
        district,
        gender,
        age,
        education,
        profession,
        source,
        creationDate,
      };
    }

    // Filter by period if startDate and endDate provided
    const rows =
      startDate && endDate
        ? allRows.filter((r) => {
            if (!r.creationDate) return true; // Keep if no date available or filter strictly
            return r.creationDate >= startDate && r.creationDate <= endDate;
          })
        : allRows;

    const genderCount = aggregateByGender(rows);
    const { bins: ageBins, averageAge } = aggregateByAge(rows);
    const educationCount = aggregateByCategory(rows, 'education');
    const sourceCount = aggregateByCategory(rows, 'source');
    const professionCount = aggregateByCategory(rows, 'profession');
    const byRegionGender = aggregateByRegionHierarchy(rows);
    const monthlyDynamics = aggregateMonthlyDynamics(rows);
    const topPairs = aggregateTopCrossCombinations(rows);

    return NextResponse.json({
      rows,
      allRowsCount: allRows.length,
      periodRowsCount: rows.length,
      rolling7DaysCount,
      rolling30DaysCount,
      byRegionGender,
      genderCount,
      educationCount,
      sourceCount,
      professionCount,
      ageBins,
      averageAge,
      monthlyDynamics,
      topPairs,
      dataQuality: {
        emptyPhone,
        emptyRegion,
        emptyAge,
        emptyEducation,
        emptyProfession,
        totalRows: mainRows.length,
      },
      period: {
        startDate,
        endDate,
      },
      cachedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
