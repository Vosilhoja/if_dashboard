export function normalizePhone(rawPhone: string | number | null | undefined): string {
  if (!rawPhone) return '';
  const str = String(rawPhone).trim();
  // Strip everything except digits
  let digits = str.replace(/\D/g, '');

  if (!digits) return '';

  // Uzbekistan numbers handling:
  // If 9 digits (e.g. 901234567), prepend 998 -> 998901234567
  if (digits.length === 9) {
    digits = '998' + digits;
  } else if (digits.length === 12 && digits.startsWith('998')) {
    // Already in 998XXXXXXXXX format
  } else if (digits.length === 11 && digits.startsWith('8998')) {
    // 8998XXXXXXXXX -> 998XXXXXXXXX
    digits = digits.slice(1);
  }

  return digits;
}

export function formatPhoneDisplay(normalizedPhone: string): string {
  if (!normalizedPhone) return '-';
  if (normalizedPhone.length === 12 && normalizedPhone.startsWith('998')) {
    // +998 (90) 123-45-67
    const code = normalizedPhone.slice(3, 5);
    const p1 = normalizedPhone.slice(5, 8);
    const p2 = normalizedPhone.slice(8, 10);
    const p3 = normalizedPhone.slice(10, 12);
    return `+998 (${code}) ${p1}-${p2}-${p3}`;
  }
  return `+${normalizedPhone}`;
}
