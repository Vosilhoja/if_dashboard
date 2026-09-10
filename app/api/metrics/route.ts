import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRowsForSheet, clearSheetCache, fetchStatusConfig } from '@/lib/google-sheets';
import { isDateInRange, parseSheetDate } from '@/lib/date-utils';
import { normalizePhoneWithDiagnostics } from '@/lib/phone-utils';
import {
  isLinkSentStatus,
  isRepeatSentStatus,
  isDeclinedStatus,
  isAlreadyRegisteredStatus,
  isWrongPersonStatus,
} from '@/lib/status-matcher';
import { DashboardMetrics } from '@/lib/types';

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

    // Safely load all sheets and dynamic status config in parallel
    let mainRows: Record<string, string>[] = [];
    let numbersRows: Record<string, string>[] = [];
    let eskizRows: Record<string, string>[] = [];
    let notCompletedRows: Record<string, string>[] = [];

    let mainError: string | null = null;
    let numbersError: string | null = null;
    let eskizError: string | null = null;
    let notCompletedError: string | null = null;

    const [statusConfig] = await Promise.all([
      fetchStatusConfig(refresh),
      fetchAllRowsForSheet('main', refresh)
        .then((res) => (mainRows = res))
        .catch((err) => {
          console.error('Failed to load main_base:', err);
          mainError = err.message || 'Ошибка загрузки main_base';
        }),
      fetchAllRowsForSheet('numbers', refresh)
        .then((res) => (numbersRows = res))
        .catch((err) => {
          console.error('Failed to load numbers:', err);
          numbersError = err.message || 'Ошибка загрузки numbers';
        }),
      fetchAllRowsForSheet('eskiz', refresh)
        .then((res) => (eskizRows = res))
        .catch((err) => {
          console.error('Failed to load eskiz:', err);
          eskizError = err.message || 'Ошибка загрузки eskiz';
        }),
      fetchAllRowsForSheet('not_completed', refresh)
        .then((res) => (notCompletedRows = res))
        .catch((err) => {
          console.error('Failed to load not_completed:', err);
          notCompletedError = err.message || 'Ошибка загрузки not_completed';
        }),
    ]);

    // 1. Prepare fast lookup for main_base phones and collect phone diagnostics
    const mainPhoneSet = new Set<string>();
    const phoneDiagnostics = {
      corrupted: 0,
      truncated: 0,
      invalid: 0,
      foreign: 0,
    };

    if (!mainError) {
      for (const row of mainRows) {
        const rawP = row['Phone'] || row['phone'] || row['Телефон'];
        const diag = normalizePhoneWithDiagnostics(rawP);
        if (diag.status === 'corrupted_scientific') phoneDiagnostics.corrupted++;
        else if (diag.status === 'truncated') phoneDiagnostics.truncated++;
        else if (diag.status === 'invalid') phoneDiagnostics.invalid++;
        else if (diag.status === 'foreign') phoneDiagnostics.foreign++;

        if (diag.normalized) {
          mainPhoneSet.add(diag.normalized);
        }
      }
    }

    // Filter rows for the period
    // -------------------------------------------------------------
    // Metric 1: Calls count (rows in numbers in period, every row is a call)
    let callsCountVal = 0;
    const numbersInPeriod: Record<string, string>[] = [];
    if (!numbersError) {
      for (const row of numbersRows) {
        const rawP = row['Телефон'] || row['Phone'];
        const diag = normalizePhoneWithDiagnostics(rawP);
        if (diag.status === 'corrupted_scientific') phoneDiagnostics.corrupted++;
        else if (diag.status === 'truncated') phoneDiagnostics.truncated++;
        else if (diag.status === 'invalid') phoneDiagnostics.invalid++;
        else if (diag.status === 'foreign') phoneDiagnostics.foreign++;

        const dateStr = row['Дата (формат xx.xx.xxxx)'] || row['Дата'] || row['date'];
        const d = parseSheetDate(dateStr);
        if (isDateInRange(d, startDate, endDate)) {
          callsCountVal++;
          numbersInPeriod.push(row);
        }
      }
    }

    // Metric 2: SMS sent verification (eskiz DELIVERED + ACCEPTED vs numbers link_sent in period)
    let eskizCount = 0;
    if (!eskizError) {
      for (const row of eskizRows) {
        const dateStr = row['Дата'] || row['Отправлено в'] || row['date'];
        const status = (row['Статус'] || '').trim().toUpperCase();
        const d = parseSheetDate(dateStr);
        // Only count DELIVERED and ACCEPTED as successfully sent (excluding REJECTED)
        if (isDateInRange(d, startDate, endDate) && (status === 'DELIVERED' || status === 'ACCEPTED')) {
          eskizCount++;
        }
      }
    }

    let numbersLinkSentCount = 0;
    let declinedVal = 0;
    let alreadyRegisteredVal = 0;
    let wrongPersonVal = 0;

    if (!numbersError) {
      for (const row of numbersInPeriod) {
        const comment = (row['Коментарий'] || '').trim();

        if (isLinkSentStatus(comment, statusConfig.linkSent)) {
          numbersLinkSentCount++;
        }
        if (isDeclinedStatus(comment, statusConfig.declined)) {
          declinedVal++;
        }
        if (isAlreadyRegisteredStatus(comment, statusConfig.alreadyRegistered)) {
          alreadyRegisteredVal++;
        }
        if (isWrongPersonStatus(comment, statusConfig.wrongPerson)) {
          wrongPersonVal++;
        }
      }
    }

    const smsRatio = eskizCount > 0 ? numbersLinkSentCount / eskizCount : 1;
    const smsRatioPercent = (smsRatio * 100).toFixed(1);
    const smsIsAlert = eskizCount > 0 && smsRatio < statusConfig.thresholds.smsMatchPercentage;

    // Metric 3: Registered in panel (main_base created in period)
    let registeredMainVal = 0;
    if (!mainError) {
      for (const row of mainRows) {
        const dateStr = row['Дата создания'] || row['date'] || row['Дата'];
        const d = parseSheetDate(dateStr);
        if (isDateInRange(d, startDate, endDate)) {
          registeredMainVal++;
        }
      }
    }

    // Metric 4: Registered from support (numbers in period matched in main_base)
    // Counts unique users who registered after support contact
    let totalSupportMatchesCount = 0;
    const matchedPhonesSupport = new Set<string>();
    if (!numbersError && !mainError) {
      for (const row of numbersInPeriod) {
        const pDiag = normalizePhoneWithDiagnostics(row['Телефон'] || row['Phone']);
        const p = pDiag.normalized;
        if (p && mainPhoneSet.has(p)) {
          totalSupportMatchesCount++;
          matchedPhonesSupport.add(p);
        }
      }
    }

    // Metric 5: Registered after repeat link sent
    let repeatStatusesFoundInPeriod = 0;
    let totalRepeatMatchesCount = 0;
    const matchedRepeatPhones = new Set<string>();
    if (!numbersError && !mainError) {
      for (const row of numbersInPeriod) {
        const comment = (row['Коментарий'] || '').trim();
        if (isRepeatSentStatus(comment, statusConfig.repeatSent)) {
          repeatStatusesFoundInPeriod++;
          const pDiag = normalizePhoneWithDiagnostics(row['Телефон'] || row['Phone']);
          const p = pDiag.normalized;
          if (p && mainPhoneSet.has(p)) {
            totalRepeatMatchesCount++;
            matchedRepeatPhones.add(p);
          }
        }
      }
    }

    // Metric 9: Not completed registrations in period
    let notCompletedInPeriodCount = 0;
    if (!notCompletedError) {
      for (const row of notCompletedRows) {
        // Defensive check: ensure status is Not completed if status column exists
        const status = (row['Статус'] || row['status'] || '').trim().toLowerCase();
        if (status && !status.includes('not completed') && !status.includes('не заверш')) {
          continue;
        }

        const dateStr = row['Дата создания'] || row['Start date'] || row['Дата'] || row['Creation date'] || '';
        const d = parseSheetDate(dateStr);
        if (isDateInRange(d, startDate, endDate)) {
          notCompletedInPeriodCount++;
        }
      }
    }

    // Anomaly Detection: Compare Current Period (calls & declined) with Average of Previous 4 Weeks
    let anomalyData: DashboardMetrics['anomalyData'] = undefined;
    const pStart = parseSheetDate(startDate);
    const pEnd = parseSheetDate(endDate);

    if (pStart && pEnd && !numbersError) {
      // Calculate active day of week indices in current period
      const activeDaysOfWeek = new Set<number>();
      const cur = new Date(pStart);
      while (cur <= pEnd) {
        activeDaysOfWeek.add(cur.getDay());
        cur.setDate(cur.getDate() + 1);
      }

      // Collect numbers per week for previous 4 weeks
      const weekCounts: { calls: number; declined: number }[] = [];
      for (let w = 1; w <= 4; w++) {
        const wStart = new Date(pStart);
        wStart.setDate(wStart.getDate() - w * 7);
        const wEnd = new Date(pEnd);
        wEnd.setDate(wEnd.getDate() - w * 7);

        let wCalls = 0;
        let wDeclined = 0;

        for (const row of numbersRows) {
          const dateStr = row['Дата (формат xx.xx.xxxx)'] || row['Дата'] || row['date'];
          const d = parseSheetDate(dateStr);
          if (d && d >= wStart && d <= wEnd && activeDaysOfWeek.has(d.getDay())) {
            wCalls++;
            const comment = (row['Коментарий'] || '').trim();
            if (isDeclinedStatus(comment, statusConfig.declined)) {
              wDeclined++;
            }
          }
        }
        weekCounts.push({ calls: wCalls, declined: wDeclined });
      }

      const avgCalls = Math.round(
        weekCounts.reduce((acc, curr) => acc + curr.calls, 0) / (weekCounts.length || 1)
      );
      const avgDeclined = Math.round(
        weekCounts.reduce((acc, curr) => acc + curr.declined, 0) / (weekCounts.length || 1)
      );

      const calcAnomaly = (current: number, baseline: number) => {
        if (baseline === 0) {
          const delta = current > 0 ? 100 : 0;
          return {
            current,
            baseline4WeeksAvg: baseline,
            deltaPercent: delta,
            isAnomaly: current > 5,
            direction: (current > 0 ? 'up' : 'normal') as 'up' | 'down' | 'normal',
          };
        }
        const deltaPercent = Math.round(((current - baseline) / baseline) * 100);
        const absDelta = Math.abs(deltaPercent);
        const isAnomaly = absDelta >= 30;
        const direction: 'up' | 'down' | 'normal' =
          deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'normal';
        return {
          current,
          baseline4WeeksAvg: baseline,
          deltaPercent,
          isAnomaly,
          direction,
        };
      };

      anomalyData = {
        callsAnomaly: calcAnomaly(callsCountVal, avgCalls),
        declinedAnomaly: calcAnomaly(declinedVal, avgDeclined),
      };
    }

    const response: DashboardMetrics = {
      callsCount: {
        value: numbersError ? '—' : callsCountVal,
        subtext: numbersError ? undefined : `Всего звонков за выбранный период`,
        error: numbersError || undefined,
      },
      smsSentVerification: {
        value: (eskizError || numbersError) ? '—' : `${numbersLinkSentCount} / ${eskizCount}`,
        ratio: smsRatio,
        isAlert: smsIsAlert,
        statusText: (eskizError || numbersError)
          ? undefined
          : eskizCount === 0
          ? 'Нет SMS за период'
          : `Соотношение: ${smsRatioPercent}% ${smsIsAlert ? '⚠️ Ниже 90%' : '✅ В норме'}`,
        subtext: `Найдено в numbers: ${numbersLinkSentCount} | В eskiz (DELIVERED+ACCEPTED): ${eskizCount}`,
        error: (eskizError || numbersError) || undefined,
      },
      registeredMainBase: {
        value: mainError ? '—' : registeredMainVal,
        subtext: mainError ? undefined : `Новых пользователей в main_base за период`,
        error: mainError || undefined,
      },
      registeredFromSupport: {
        value: (numbersError || mainError) ? '—' : matchedPhonesSupport.size,
        subtext: (numbersError || mainError)
          ? undefined
          : `Уникальных номеров в базе (всего звонков по ним: ${totalSupportMatchesCount})`,
        error: (numbersError || mainError) || undefined,
      },
      registeredAfterRepeat: {
        value: (numbersError || mainError)
          ? '—'
          : repeatStatusesFoundInPeriod === 0
          ? 0
          : matchedRepeatPhones.size,
        subtext: (numbersError || mainError)
          ? undefined
          : repeatStatusesFoundInPeriod === 0
          ? '0 (статусов повтора не найдено в данных)'
          : `Уникальных номеров (всего совпадений: ${totalRepeatMatchesCount})`,
        error: (numbersError || mainError) || undefined,
      },
      declinedCount: {
        value: numbersError ? '—' : declinedVal,
        subtext: numbersError ? undefined : `Отказов, нет времени, бросили трубку за период`,
        error: numbersError || undefined,
      },
      alreadyRegisteredCount: {
        value: numbersError ? '—' : alreadyRegisteredVal,
        subtext: numbersError ? undefined : `Уже зарегистрированы через бот (bot bor и др.)`,
        error: numbersError || undefined,
      },
      wrongPersonCount: {
        value: numbersError ? '—' : wrongPersonVal,
        subtext: numbersError ? undefined : `Не тот номер, другой человек, второй номер`,
        error: numbersError || undefined,
      },
      notCompletedCount: {
        value: notCompletedError ? '—' : notCompletedInPeriodCount,
        subtext: notCompletedError ? undefined : `Не завершили регистрацию за период`,
        error: notCompletedError || undefined,
      },
      phoneDiagnostics,
      period: {
        startDate,
        endDate,
      },
      totalRows: {
        main: mainRows.length,
        numbers: numbersRows.length,
        eskiz: eskizRows.length,
        not_completed: notCompletedRows.length,
      },
      anomalyData,
      cachedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
