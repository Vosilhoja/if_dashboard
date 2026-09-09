import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRowsForSheet, SheetType } from '@/lib/google-sheets';
import { normalizePhone } from '@/lib/phone-utils';
import { SheetPaginatedResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const resolvedParams = await params;
    const typeStr = resolvedParams.type;

    if (typeStr !== 'main' && typeStr !== 'numbers' && typeStr !== 'eskiz' && typeStr !== 'not_completed') {
      return NextResponse.json({ error: 'Неизвестный тип таблицы' }, { status: 400 });
    }

    const type = typeStr as SheetType;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') || '25', 10)));
    const search = (searchParams.get('search') || '').trim();

    const allRows = await fetchAllRowsForSheet(type);

    // Get headers from first non-empty row or sample
    let headers: string[] = [];
    if (allRows.length > 0) {
      headers = Object.keys(allRows[0]);
    }

    // Filter by phone search query if provided
    let filteredRows = allRows;
    if (search) {
      const searchNorm = normalizePhone(search);
      const searchLower = search.toLowerCase();

      filteredRows = allRows.filter((row) => {
        // Look through phone fields first
        const phone = row['Phone'] || row['Телефон'] || row['Номер телефона'] || '';
        if (phone) {
          const normPhone = normalizePhone(phone);
          if (normPhone.includes(searchNorm) || phone.includes(search)) {
            return true;
          }
        }

        // Also check other fields (name, comment, status)
        for (const [k, v] of Object.entries(row)) {
          if (String(v).toLowerCase().includes(searchLower)) {
            return true;
          }
        }
        return false;
      });
    }

    const total = filteredRows.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

    const result: SheetPaginatedResponse = {
      type,
      page,
      pageSize,
      total,
      totalPages,
      headers,
      rows: paginatedRows,
      cachedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка получения данных таблицы';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
