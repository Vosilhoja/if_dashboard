import { NextResponse } from 'next/server';
import { getSheetId } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sheetId = getSheetId('numbers');
    // Direct link to the settings sheet tab
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}#gid=538596832`;
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
