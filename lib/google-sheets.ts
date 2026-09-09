import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export type SheetType = 'main' | 'numbers' | 'eskiz';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache with 3 minutes TTL
const CACHE_TTL_MS = 3 * 60 * 1000;
const cache: { [key: string]: CacheEntry<Record<string, string>[]> } = {};

function getJwtClient(): JWT {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in environment.');
  }

  // Handle formatted private key with quotes or escaped newlines
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  return new JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export function getSheetId(type: SheetType): string {
  let id = '';
  switch (type) {
    case 'main':
      id = process.env.GOOGLE_SHEET_MAIN || '';
      break;
    case 'numbers':
      id = process.env.GOOGLE_SHEET_NUMBERS || '';
      break;
    case 'eskiz':
      id = process.env.GOOGLE_SHEET_ESKIZ || '';
      break;
  }
  if (!id) {
    throw new Error(`Sheet ID for type "${type}" is not configured in environment variables.`);
  }
  return id;
}

export async function fetchAllRowsForSheet(
  type: SheetType,
  forceRefresh = false
): Promise<Record<string, string>[]> {
  const cacheKey = `sheet_${type}`;
  const now = Date.now();

  if (!forceRefresh && cache[cacheKey]) {
    if (now - cache[cacheKey].timestamp < CACHE_TTL_MS) {
      return cache[cacheKey].data;
    }
  }

  const auth = getJwtClient();
  const sheetId = getSheetId(type);
  const doc = new GoogleSpreadsheet(sheetId, auth);

  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  if (!sheet) {
    throw new Error(`No sheets found in document for "${type}"`);
  }

  await sheet.loadHeaderRow();
  const rawRows = await sheet.getRows();

  const data: Record<string, string>[] = rawRows.map((row: GoogleSpreadsheetRow) => {
    const obj: Record<string, string> = {};
    for (const h of sheet.headerValues) {
      obj[h] = row.get(h) ?? '';
    }
    return obj;
  });

  cache[cacheKey] = {
    data,
    timestamp: now,
  };

  return data;
}

export function clearSheetCache(type?: SheetType) {
  if (type) {
    delete cache[`sheet_${type}`];
  } else {
    for (const key of Object.keys(cache)) {
      delete cache[key];
    }
  }
}
