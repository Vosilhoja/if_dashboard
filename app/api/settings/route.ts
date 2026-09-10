import { NextResponse } from 'next/server';
import { getSheetId } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mainId = getSheetId('main');
    const numbersId = getSheetId('numbers');
    const eskizId = getSheetId('eskiz');
    const notCompletedId = getSheetId('not_completed');

    const statusSettingsUrl = `https://docs.google.com/spreadsheets/d/${numbersId}#gid=538596832`;

    const sheets = [
      {
        key: 'main',
        name: 'main_base',
        title: 'Основная база респондентов',
        url: `https://docs.google.com/spreadsheets/d/${mainId}`,
        sheetId: mainId,
      },
      {
        key: 'numbers',
        name: 'numbers',
        title: 'Звонки службы поддержки',
        url: `https://docs.google.com/spreadsheets/d/${numbersId}`,
        sheetId: numbersId,
      },
      {
        key: 'eskiz',
        name: 'eskiz',
        title: 'SMS шлюз Eskiz',
        url: `https://docs.google.com/spreadsheets/d/${eskizId}`,
        sheetId: eskizId,
      },
      {
        key: 'not_completed',
        name: 'not_completed',
        title: 'Не завершившие регистрацию',
        url: `https://docs.google.com/spreadsheets/d/${notCompletedId}`,
        sheetId: notCompletedId,
      },
    ];

    return NextResponse.json({
      settingsUrl: statusSettingsUrl,
      sheets,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
