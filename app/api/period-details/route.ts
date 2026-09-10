import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRowsForSheet } from '@/lib/google-sheets';
import { isDateInRange, parseSheetDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const [numbersRows, notCompletedRows] = await Promise.all([
      fetchAllRowsForSheet('numbers').catch((err) => {
        console.error('Failed to load numbers for period details:', err);
        return [];
      }),
      fetchAllRowsForSheet('not_completed').catch((err) => {
        console.error('Failed to load not_completed for period details:', err);
        return [];
      }),
    ]);

    const calls = numbersRows.filter((row) => {
      const dateStr = row['Дата (формат xx.xx.xxxx)'] || row['Дата'] || row['date'];
      const d = parseSheetDate(dateStr);
      return isDateInRange(d, startDate, endDate);
    });

    const notCompleted = notCompletedRows.filter((row) => {
      const status = (row['Статус'] || row['status'] || '').trim().toLowerCase();
      if (status && !status.includes('not completed') && !status.includes('не заверш')) {
        return false;
      }
      const dateStr =
        row['Дата создания'] ||
        row['Start date'] ||
        row['Дата'] ||
        row['Creation date'] ||
        '';
      const d = parseSheetDate(dateStr);
      return isDateInRange(d, startDate, endDate);
    });

    return NextResponse.json({
      startDate,
      endDate,
      totalCalls: calls.length,
      totalNotCompleted: notCompleted.length,
      calls,
      notCompleted,
      cachedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('API /api/period-details error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
