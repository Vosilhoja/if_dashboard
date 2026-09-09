// lib/phone-utils.ts

export type PhoneStatus = 'ok' | 'corrupted_scientific' | 'foreign' | 'truncated' | 'invalid';
export type CountryCode = 'UZ' | 'RU' | 'UA' | 'KZ' | 'US' | 'UNKNOWN';

export interface PhoneDiagnostic {
  normalized: string;
  status: PhoneStatus;
  country: CountryCode;
  original: string;
}

interface CountryRule {
  code: CountryCode;
  countryDigits: string; // '998', '7', '380', '1'
  localLength: number; // length of subscriber part
}

const COUNTRY_RULES: CountryRule[] = [
  { code: 'UZ', countryDigits: '998', localLength: 9 },
  { code: 'RU', countryDigits: '7', localLength: 10 },
  { code: 'KZ', countryDigits: '7', localLength: 10 },
  { code: 'UA', countryDigits: '380', localLength: 9 },
  { code: 'US', countryDigits: '1', localLength: 10 },
];

/**
 * Checks if raw value is broken by Excel scientific notation float
 */
function looksLikeCorruptedScientific(raw: string | number): boolean {
  const str = String(raw);
  if (/e\+?\d+/i.test(str)) return true;
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) && raw > 1e14) return true;
    if (raw > 1e14) return true;
  }
  return false;
}

function isAllSameDigit(digits: string): boolean {
  return digits.length > 0 && digits.split('').every((d) => d === digits[0]);
}

export function normalizePhoneWithDiagnostics(
  rawPhone: string | number | null | undefined
): PhoneDiagnostic {
  const original = rawPhone === null || rawPhone === undefined ? '' : String(rawPhone);

  if (!rawPhone && rawPhone !== 0) {
    return { normalized: '', status: 'invalid', country: 'UNKNOWN', original };
  }

  if (looksLikeCorruptedScientific(rawPhone)) {
    return { normalized: '', status: 'corrupted_scientific', country: 'UNKNOWN', original };
  }

  let digits = original.replace(/\D/g, '');

  if (!digits || digits.length <= 8 || isAllSameDigit(digits)) {
    return { normalized: '', status: 'invalid', country: 'UNKNOWN', original };
  }

  // --- 1. UZBEKISTAN PRIORITY RULES (Data is predominantly Uzbek) ---

  // 9 digits -> add 998
  if (digits.length === 9) {
    if (digits.startsWith('998')) {
      // 998 + 6 digits = truncated
      return { normalized: '', status: 'truncated', country: 'UZ', original };
    }
    return { normalized: '998' + digits, status: 'ok', country: 'UZ', original };
  }

  // 10 digits starting with local 0 -> remove 0, add 998
  if (digits.length === 10 && digits.startsWith('0')) {
    return { normalized: '998' + digits.slice(1), status: 'ok', country: 'UZ', original };
  }

  // 12 digits, already 998... -> normal Uzbek
  if (digits.length === 12 && digits.startsWith('998')) {
    return { normalized: digits, status: 'ok', country: 'UZ', original };
  }

  // 11 digits starting with 8998 or 998
  if (digits.length === 11) {
    if (digits.startsWith('8998') || digits.startsWith('998')) {
      return { normalized: '', status: 'truncated', country: 'UZ', original };
    }
  }

  // 13-14 digits starting with 8998 (13 digits) or 998998 (doubled code)
  if (digits.length === 13 || digits.length === 14) {
    if (digits.startsWith('8998') && digits.length === 13) {
      return { normalized: digits.slice(1), status: 'ok', country: 'UZ', original };
    }
    if (digits.startsWith('998998')) {
      return { normalized: digits.slice(3), status: 'ok', country: 'UZ', original };
    }
  }

  // --- 2. MULTI-COUNTRY RULES FOR NON-UZBEK NUMBERS ---

  // Russia & Kazakhstan (+7)
  // 11 digits starting with 8 or 7
  if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    const subscriber = digits.slice(1);
    // Kazakhstan typically has subscriber prefixes 6xx, 7xx (770, 771, 775, 776, 777, 778, 700, 701, etc.)
    const isKZ = /^[67]/.test(subscriber);
    return {
      normalized: '7' + subscriber,
      status: 'foreign',
      country: isKZ ? 'KZ' : 'RU',
      original,
    };
  }
  // 10 digits without country code for RU/KZ (not starting with 0, not Uzbek 9 digits)
  // Note: Uzbek numbers of 10 digits starting with 0 were handled above.
  if (digits.length === 10 && !digits.startsWith('0')) {
    const isKZ = /^[67]/.test(digits);
    return {
      normalized: '7' + digits,
      status: 'foreign',
      country: isKZ ? 'KZ' : 'RU',
      original,
    };
  }

  // Ukraine (+380)
  // 12 digits starting with 380
  if (digits.length === 12 && digits.startsWith('380')) {
    return { normalized: digits, status: 'foreign', country: 'UA', original };
  }
  // 10 digits starting with 0 (e.g. 0501234567) or 9 digits local
  if (digits.length === 10 && digits.startsWith('0') && !digits.startsWith('09')) {
    return { normalized: '380' + digits.slice(1), status: 'foreign', country: 'UA', original };
  }

  // USA (+1)
  // 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return { normalized: digits, status: 'foreign', country: 'US', original };
  }

  // If 13-14 digits were not UZ patterns:
  if (digits.length === 13 || digits.length === 14) {
    return { normalized: '', status: 'truncated', country: 'UNKNOWN', original };
  }

  // Default international / foreign if reasonable length (9-15 digits)
  if (digits.length >= 9 && digits.length <= 15) {
    return { normalized: digits, status: 'foreign', country: 'UNKNOWN', original };
  }

  return { normalized: '', status: 'invalid', country: 'UNKNOWN', original };
}

/** Backwards-compatible normalizePhone returning string */
export function normalizePhone(rawPhone: string | number | null | undefined): string {
  return normalizePhoneWithDiagnostics(rawPhone).normalized;
}

export function formatPhoneDisplay(
  normalizedPhone: string,
  country?: CountryCode
): string {
  if (!normalizedPhone) return '-';

  // UZ (+998)
  if (normalizedPhone.length === 12 && normalizedPhone.startsWith('998')) {
    const code = normalizedPhone.slice(3, 5);
    const p1 = normalizedPhone.slice(5, 8);
    const p2 = normalizedPhone.slice(8, 10);
    const p3 = normalizedPhone.slice(10, 12);
    return `+998 (${code}) ${p1}-${p2}-${p3}`;
  }

  // RU / KZ (+7)
  if (normalizedPhone.length === 11 && normalizedPhone.startsWith('7')) {
    const code = normalizedPhone.slice(1, 4);
    const p1 = normalizedPhone.slice(4, 7);
    const p2 = normalizedPhone.slice(7, 9);
    const p3 = normalizedPhone.slice(9, 11);
    return `+7 (${code}) ${p1}-${p2}-${p3}`;
  }

  // UA (+380)
  if (normalizedPhone.length === 12 && normalizedPhone.startsWith('380')) {
    const code = normalizedPhone.slice(3, 5);
    const p1 = normalizedPhone.slice(5, 8);
    const p2 = normalizedPhone.slice(8, 10);
    const p3 = normalizedPhone.slice(10, 12);
    return `+380 ${code} ${p1} ${p2} ${p3}`;
  }

  // US (+1)
  if (normalizedPhone.length === 11 && normalizedPhone.startsWith('1')) {
    const code = normalizedPhone.slice(1, 4);
    const p1 = normalizedPhone.slice(4, 7);
    const p2 = normalizedPhone.slice(7, 11);
    return `+1 (${code}) ${p1}-${p2}`;
  }

  return `+${normalizedPhone}`;
}
