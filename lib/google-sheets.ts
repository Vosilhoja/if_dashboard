import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export type SheetType = 'main' | 'numbers' | 'eskiz' | 'numbers_repeat' | 'not_completed';

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
    case 'numbers_repeat':
      id = process.env.GOOGLE_SHEET_NUMBERS || '';
      break;
    case 'eskiz':
      id = process.env.GOOGLE_SHEET_ESKIZ || '';
      break;
    case 'not_completed':
      id = process.env.GOOGLE_SHEET_NOT_COMPLETED || '';
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
  let sheet = doc.sheetsByIndex[0];
  if (type === 'numbers_repeat') {
    sheet = doc.sheetsByTitle['Повторные'] || doc.sheetsByTitle['повторные'] || doc.sheetsByIndex[1] || sheet;
  }
  if (!sheet) {
    throw new Error(`No sheets found in document for "${type}"`);
  }

  await sheet.loadHeaderRow().catch(() => {});
  const rawRows = await sheet.getRows().catch(() => []);

  const data: Record<string, string>[] = rawRows.map((row: GoogleSpreadsheetRow) => {
    const obj: Record<string, string> = {};
    for (const h of sheet.headerValues || []) {
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

import { DEFAULT_STATUS_CONFIG, StatusConfigType } from './status-config';

// Status config cache
let statusConfigCache: { data: StatusConfigType; timestamp: number } | null = null;

export async function fetchStatusConfig(forceRefresh = false): Promise<StatusConfigType> {
  const now = Date.now();
  if (!forceRefresh && statusConfigCache) {
    if (now - statusConfigCache.timestamp < CACHE_TTL_MS) {
      return statusConfigCache.data;
    }
  }

  try {
    const auth = getJwtClient();
    const sheetId = getSheetId('numbers');
    const doc = new GoogleSpreadsheet(sheetId, auth);
    await doc.loadInfo();

    const settingsSheet = doc.sheetsByTitle['settings'];
    if (!settingsSheet) {
      console.warn('Settings sheet not found in numbers document. Using default status config.');
      return DEFAULT_STATUS_CONFIG;
    }

    await settingsSheet.loadHeaderRow();
    const rows = await settingsSheet.getRows();

    const linkSentPhrases: string[] = [];
    const repeatSentPhrases: string[] = [];
    const declinedPhrases: string[] = [];
    const alreadyRegisteredPhrases: string[] = [];
    const wrongPersonPhrases: string[] = [];

    rows.forEach((row: GoogleSpreadsheetRow) => {
      const category = (row.get('category') || '').trim();
      const phrase = (row.get('phrase') || '').trim();
      if (!phrase) return;

      if (category === 'link_sent') {
        linkSentPhrases.push(phrase);
      } else if (category === 'repeat_sent') {
        repeatSentPhrases.push(phrase);
      } else if (category === 'declined') {
        declinedPhrases.push(phrase);
      } else if (category === 'already_registered' || category === 'alreadyRegistered') {
        alreadyRegisteredPhrases.push(phrase);
      } else if (category === 'wrong_person' || category === 'wrongPerson') {
        wrongPersonPhrases.push(phrase);
      }
    });

    // Fallback if empty
    const dynamicConfig: StatusConfigType = {
      linkSent: {
        ...DEFAULT_STATUS_CONFIG.linkSent,
        phrases: linkSentPhrases.length > 0 ? linkSentPhrases : DEFAULT_STATUS_CONFIG.linkSent.phrases,
      },
      repeatSent: {
        ...DEFAULT_STATUS_CONFIG.repeatSent,
        phrases: repeatSentPhrases.length > 0 ? repeatSentPhrases : DEFAULT_STATUS_CONFIG.repeatSent.phrases,
      },
      declined: {
        ...DEFAULT_STATUS_CONFIG.declined,
        phrases: declinedPhrases.length > 0 ? declinedPhrases : DEFAULT_STATUS_CONFIG.declined.phrases,
      },
      alreadyRegistered: {
        ...DEFAULT_STATUS_CONFIG.alreadyRegistered,
        phrases: alreadyRegisteredPhrases.length > 0 ? alreadyRegisteredPhrases : DEFAULT_STATUS_CONFIG.alreadyRegistered.phrases,
      },
      wrongPerson: {
        ...DEFAULT_STATUS_CONFIG.wrongPerson,
        phrases: wrongPersonPhrases.length > 0 ? wrongPersonPhrases : DEFAULT_STATUS_CONFIG.wrongPerson.phrases,
      },
      thresholds: DEFAULT_STATUS_CONFIG.thresholds,
    };

    statusConfigCache = {
      data: dynamicConfig,
      timestamp: now,
    };

    return dynamicConfig;
  } catch (err) {
    console.error('Failed to fetch status config from Google Sheets, using defaults:', err);
    return DEFAULT_STATUS_CONFIG;
  }
}

export function clearSheetCache(type?: SheetType) {
  statusConfigCache = null;
  if (type) {
    delete cache[`sheet_${type}`];
  } else {
    for (const key of Object.keys(cache)) {
      delete cache[key];
    }
  }
}
