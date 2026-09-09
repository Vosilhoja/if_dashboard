import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRowsForSheet, clearSheetCache } from '@/lib/google-sheets';
import { isDateInRange, parseSheetDate } from '@/lib/date-utils';
import { normalizePhone } from '@/lib/phone-utils';
import { isLinkSentStatus, isRepeatSentStatus } from '@/lib/status-matcher';
import { STATUS_CONFIG } from '@/lib/status-config';
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

    // Safely load all 3 sheets with individual error handling so one failing sheet doesn't crash everything
    let mainRows: Record<string, string>[] = [];
    let numbersRows: Record<string, string>[] = [];
    let eskizRows: Record<string, string>[] = [];

    let mainError: string | null = null;
    let numbersError: string | null = null;
    let eskizError: string | null = null;

    await Promise.all([
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
    ]);

    // 1. Prepare fast lookup for main_base phones
    // Key: normalized phone, Value: true
    const mainPhoneSet = new Set<string>();
    if (!mainError) {
      for (const row of mainRows) {
        const p = normalizePhone(row['Phone'] || row['phone'] || row['Телефон']);
        if (p) mainPhoneSet.add(p);
      }
    }

    // Filter rows for the period
    // -------------------------------------------------------------
    // Metric 1: Calls count (rows in numbers in period)
    let callsCountVal = 0;
    const numbersInPeriod: Record<string, string>[] = [];
    if (!numbersError) {
      for (const row of numbersRows) {
        const dateStr = row['Дата (формат xx.xx.xxxx)'] || row['Дата'] || row['date'];
        const d = parseSheetDate(dateStr);
        if (isDateInRange(d, startDate, endDate)) {
          callsCountVal++;
          numbersInPeriod.push(row);
        }
      }
    }

    // Metric 2: SMS sent verification (eskiz in period vs numbers link_sent in period)
    let eskizCount = 0;
    if (!eskizError) {
      for (const row of eskizRows) {
        const dateStr = row['Дата'] || row['Отправлено в'] || row['date'];
        const d = parseSheetDate(dateStr);
        if (isDateInRange(d, startDate, endDate)) {
          eskizCount++;
        }
      }
    }

    let numbersLinkSentCount = 0;
    if (!numbersError) {
      for (const row of numbersInPeriod) {
        const comment = row['Коментарий'] || '';
        const status = row['Статус звонка'] || '';
        if (isLinkSentStatus(comment) || isLinkSentStatus(status)) {
          numbersLinkSentCount++;
        }
      }
    }

    const smsRatio = eskizCount > 0 ? numbersLinkSentCount / eskizCount : 1;
    const smsRatioPercent = (smsRatio * 100).toFixed(1);
    const smsIsAlert = eskizCount > 0 && smsRatio < STATUS_CONFIG.thresholds.smsMatchPercentage;

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
    // We normalize phone for each numbers row and check mainPhoneSet
    let registeredFromSupportCount = 0;
    const matchedPhonesSupport = new Set<string>();
    if (!numbersError && !mainError) {
      for (const row of numbersInPeriod) {
        const p = normalizePhone(row['Телефон'] || row['Phone']);
        if (p && mainPhoneSet.has(p)) {
          registeredFromSupportCount++;
          matchedPhonesSupport.add(p);
        }
      }
    }

    // Metric 5: Registered after repeat link sent
    let registeredAfterRepeatCount = 0;
    const matchedRepeatPhones = new Set<string>();
    if (!numbersError && !mainError) {
      for (const row of numbersInPeriod) {
        const comment = row['Коментарий'] || '';
        const status = row['Статус звонка'] || '';
        if (isRepeatSentStatus(comment) || isRepeatSentStatus(status)) {
          const p = normalizePhone(row['Телефон'] || row['Phone']);
          if (p && mainPhoneSet.has(p)) {
            registeredAfterRepeatCount++;
            matchedRepeatPhones.add(p);
          }
        }
      }
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
        subtext: `Найдено в numbers: ${numbersLinkSentCount} | В eskiz: ${eskizCount}`,
        error: (eskizError || numbersError) || undefined,
      },
      registeredMainBase: {
        value: mainError ? '—' : registeredMainVal,
        subtext: mainError ? undefined : `Новых пользователей в main_base за период`,
        error: mainError || undefined,
      },
      registeredFromSupport: {
        value: (numbersError || mainError) ? '—' : registeredFromSupportCount,
        subtext: (numbersError || mainError)
          ? undefined
          : `Совпадений номеров с базой (уникальных: ${matchedPhonesSupport.size})`,
        error: (numbersError || mainError) || undefined,
      },
      registeredAfterRepeat: {
        value: (numbersError || mainError) ? '—' : registeredAfterRepeatCount,
        subtext: (numbersError || mainError)
          ? undefined
          : `Статусы повторной отправки (уникальных: ${matchedRepeatPhones.size})`,
        error: (numbersError || mainError) || undefined,
      },
      period: {
        startDate,
        endDate,
      },
      totalRows: {
        main: mainRows.length,
        numbers: numbersRows.length,
        eskiz: eskizRows.length,
      },
      cachedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
