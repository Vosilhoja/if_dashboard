// lib/phone-utils.ts

export type PhoneStatus = 'ok' | 'corrupted_scientific' | 'foreign' | 'truncated' | 'invalid';

export interface PhoneDiagnostic {
  normalized: string;
  status: PhoneStatus;
  original: string;
}

/**
 * Определяет, является ли сырое значение испорченным Excel-числом
 * в scientific notation (типа 9.09269949997969e+17).
 * Проверяем ДО очистки от нецифровых символов.
 */
function looksLikeCorruptedScientific(raw: string | number): boolean {
  const str = String(raw);
  if (/e\+?\d+/i.test(str)) return true;
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) && raw > 1e14) return true;
    if (raw > 1e14) return true; // подозрительно длинное число, физический номер столько цифр не имеет
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
    return { normalized: '', status: 'invalid', original };
  }

  if (looksLikeCorruptedScientific(rawPhone)) {
    return { normalized: '', status: 'corrupted_scientific', original };
  }

  let digits = original.replace(/\D/g, '');

  if (!digits || digits.length <= 8 || isAllSameDigit(digits)) {
    return { normalized: '', status: 'invalid', original };
  }

  // 9 цифр -> добавить 998
  if (digits.length === 9) {
    if (digits.startsWith('998')) {
      // 998 + 6 цифр = подозрительно короткий номер (truncated)
      return { normalized: '', status: 'truncated', original };
    }
    return { normalized: '998' + digits, status: 'ok', original };
  }

  // 10 цифр, начинается с локального 0 -> убрать 0, добавить 998
  if (digits.length === 10 && digits.startsWith('0')) {
    return { normalized: '998' + digits.slice(1), status: 'ok', original };
  }

  // 12 цифр, уже 998... -> норма
  if (digits.length === 12 && digits.startsWith('998')) {
    return { normalized: digits, status: 'ok', original };
  }

  // 12 цифр, начинается с 8998 обрезано неверно быть не может (это 12 цифр не 8998),
  // реальный кейс "8" + "998" + 9 цифр = 13 цифр, обработаем в ветке 13-14 ниже.
  // 11 цифр: 8998XXXXXXX (8 + 998 + 7 цифр = неполный номер) или 998XXXXXXXX (998 + 8 цифр = неполный)
  if (digits.length === 11) {
    if (digits.startsWith('8998')) {
      // "8998" + 7 цифр = всего 11, абонентских цифр только 7 из 9 - неполный номер
      return { normalized: '', status: 'truncated', original };
    }
    if (digits.startsWith('998')) {
      // 998 + 8 цифр (нужно 9) - неполный номер
      return { normalized: '', status: 'truncated', original };
    }
    // Не наш код страны (7 - Россия, 375 - Беларусь и т.п.) - оставляем как иностранный
    return { normalized: digits, status: 'foreign', original };
  }

  // 13-14 цифр: возможное задвоение кода страны "998998..." или "8" + "998" + 9 цифр = 13
  if (digits.length === 13 || digits.length === 14) {
    if (digits.startsWith('8998') && digits.length === 13) {
      // 8 + 998 + 9 цифр = корректный номер с ведущей восьмёркой доступа
      return { normalized: digits.slice(1), status: 'ok', original };
    }
    if (digits.startsWith('998998')) {
      // код страны введён дважды
      return { normalized: digits.slice(3), status: 'ok', original };
    }
    return { normalized: '', status: 'truncated', original };
  }

  // Всё остальное - не 998, не похоже на известный паттерн: считаем иностранным,
  // если длина разумная (>= 9), иначе - невалидным (уже отсеяно длиной <=8 выше)
  return { normalized: digits, status: 'foreign', original };
}

/** Обратная совместимость: старые вызовы normalizePhone(x) продолжают работать */
export function normalizePhone(rawPhone: string | number | null | undefined): string {
  return normalizePhoneWithDiagnostics(rawPhone).normalized;
}

export function formatPhoneDisplay(normalizedPhone: string): string {
  if (!normalizedPhone) return '-';
  if (normalizedPhone.length === 12 && normalizedPhone.startsWith('998')) {
    const code = normalizedPhone.slice(3, 5);
    const p1 = normalizedPhone.slice(5, 8);
    const p2 = normalizedPhone.slice(8, 10);
    const p3 = normalizedPhone.slice(10, 12);
    return `+998 (${code}) ${p1}-${p2}-${p3}`;
  }
  return `+${normalizedPhone}`;
}
