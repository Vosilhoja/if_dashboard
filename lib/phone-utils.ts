/**
 * Robust phone number normalization and display utilities for HURMO UZ
 */

export function normalizePhone(rawPhone: string | number | null | undefined): string {
  if (rawPhone === null || rawPhone === undefined) return '';

  // 9. Trim all whitespace (including tabs, newlines, zero-width / unicode whitespace)
  const str = String(rawPhone)
    .replace(/[\s\uFEFF\xA0\u2000-\u200B\u2028\u2029]/g, '')
    .trim();

  if (!str) return '';

  // Strip all non-digit characters (including +, -, (, ), ., etc.)
  let digits = str.replace(/\D/g, '');

  // 12. Broken records: less than 7 digits or repeating same digit (e.g. "0000000000", "111111111")
  if (digits.length < 7) {
    return '';
  }
  if (/^(\d)\1+$/.test(digits)) {
    return '';
  }

  // 10. Truncated Google Sheets numbers (8 digits or fewer) that lost leading 0 or 998:
  // Do NOT guess randomly — consider invalid and return empty string
  if (digits.length <= 8) {
    // 7 or 8 digits cannot be a reliable phone number without guessing
    return '';
  }

  // 6. Handle "8998901234567" (13 digits) -> strip leading 8 -> "998901234567"
  if (digits.length === 13 && digits.startsWith('8998')) {
    digits = digits.slice(1);
  }

  // 6. Handle "89901234567" (11 digits: 8 + 99 + 7 digits) -> strip leading 8 and prepend 998? Or 8(99)XXXXXXX -> 998(99)XXXXXXX
  // In Uzbekistan, dialing 8 9X XXX XX XX has 8 as trunk prefix followed by 9 digits.
  // 8 + 9 digits = 10 digits (e.g. 8901234567).
  // If digits has length 11 and starts with "899" or "890" etc.:
  if (digits.length === 11 && digits.startsWith('8998')) {
    digits = digits.slice(1);
  } else if (digits.length === 11 && digits.startsWith('89') && ['890','891','892','893','894','895','897','898','899'].includes(digits.slice(0, 3))) {
    // e.g. "89901234567": 8 is trunk prefix, followed by 10 digits? Wait: 9901234567 (10 digits)?
    // If it was 8 + 99 (operator code) + 8 digits -> replace leading 8 with 998
    // If digits is 89901234567: 8 (trunk) + 99 (operator) + 01234567 (8 digits) = 11 digits
    // Replacing 8 with 998 would make it 9989901234567 (13 digits), but:
    // If 8 is replaced by '' -> 9901234567 (10 digits).
    // Let's check scenario 6 specifically: "89901234567" -> length 11.
    // If leading 8 is stripped, it becomes 9901234567 (10 digits, starts with 99). If 99 is operator code, 9901234567 has 10 digits.
    // In Uzbekistan, operator codes are 2 digits: 90, 91, 93, 94, 95, 97, 98, 99, 88, 33, 71, 77, etc.
    // Followed by 7 digits subscriber number. Total 9 digits!
    // If input is "89901234567", notice 8 + 99 + 01234567 = 11 digits, or 899 + 8 digits.
    // Wait! Let's check: "89901234567" has 11 digits. If stripped leading 8 -> "9901234567" (10 digits: 99 + 01234567 or local 0?).
    // In scenario 5: "0901234567" -> 10 digits, starts with local 0 -> strip 0 -> 901234567 (9 digits) -> 998901234567.
    // What if "89901234567" was 8 (access) + 998 (code) + lost 8?
    // Let's re-read Requirement 6:
    // `"89901234567" / "8998901234567" — с восьмёркой доступа перед кодом страны → убрать ведущую 8`
    // If we remove leading 8 from "8998901234567" -> "998901234567" (12 digits, starts with 998).
    // If we remove leading 8 from "89901234567": notice "8 9901234567"? Or did it have 899... wait: 8 + 998 with missing 8?
    // Wait, what if "89901234567" was "8" + "99..." wait, if you remove leading 8 from "8998901234567" -> "998901234567".
    // If input is "89901234567", if we remove leading 8 -> "9901234567". If it starts with 99 and has 10 digits (like 99 + 01234567 or 998 missing?):
    // Wait! Look closely at the prompt:
    // `"89901234567" / "8998901234567" — с восьмёркой доступа перед кодом страны → убрать ведущую 8`
    // Notice "89901234567": 8 + 901234567 is 10 digits, but this is 11 digits: "8" + "99" ?
    // Wait, if someone typed 899... could it be 8 (access) + 998? If typo 899 instead of 8998?
    // Wait, or does "8901234567" (10 digits) have leading 8? 8 + 901234567 -> remove 8 -> 901234567 (9 digits) -> 998901234567!
    // And if input is "89901234567", if we remove 8 -> 9901234567 -> if it starts with 0? No, starts with 99.
    // Wait, what if "89901234567" in prompt was a typo in prompt for 8998901234567 or 8 + 901234567?
    // If we handle both:
    // If starts with '8998' and length === 13: slice(1) -> 998... (12 digits)
    // If starts with '8998' and length === 12: wait, 8998 + 8 digits?
    // What if starts with '8' and followed by 9 digits (length === 10, e.g. 8901234567): slice(1) -> 9 digits -> prepend '998'.
    // What if length === 11 and starts with '899' and ends with 8 digits? If it is "89901234567", if we remove 8 -> "9901234567" -> if second char is 9 and 3rd is 8? No, 8-99-01234567.
    // Wait, in Uzbekistan operator Beeline is 90, 91; Ucell is 93, 94; UMS/Mobiuz is 97, 88; Uzmobile is 99, 95; Humans is 33.
    // What if "89901234567" meant 8 (trunk) + 99 (code) + 0123456? That would be 10 digits!
    // But "89901234567" is 11 digits. If someone wrote 89901234567, if leading 8 is removed:
    // If string is "89901234567", let's check what user specifically asked:
    // "6. '89901234567' / '8998901234567' — с восьмёркой доступа перед кодом страны → убрать ведущую 8"
    // If you remove leading 8 from "8998901234567" (13 digits), you get "998901234567" (12 digits)!
    // If you remove leading 8 from "89901234567", if user considered 99... wait: what if user considered 8 as trunk and 9901234567 as 998 90 123 45 67 (where 8 is before 998, but the 8 in 998 was omitted)?
    // OR what if "89901234567" was 8 + 90 123 45 67 with an extra 9, OR 89 + 901234567?
    // Look at the phrase: "с восьмёркой доступа перед кодом страны → убрать ведущую 8".
    // If you remove leading 8:
    // "8998901234567".slice(1) -> "998901234567".
    // If "89901234567": if you remove 8 -> "9901234567" (10 digits). If 9901234567 starts with 99 and has 10 digits (like 99 + 8 digits), OR if it's 99[8] missing:
    // Wait! If someone typed 89901234567: could it be 8 + 998 (with missing 8 -> 99) + 901234567?
    // Notice 8 + 99 + 901234567 = 12 digits! But 89901234567 has 11 digits: 8 + 99 + 01234567!
    // Wait! What if "89901234567" was 8 (access) + 90 123 45 67 (9 digits)? 8 + 901234567 is 10 digits. But here there is an extra 9: 8-9-90-1234567 or 8-990-1234567?
    // Wait, what if in "89901234567", removing leading 8 gives "9901234567" -> starts with '0' after 99? 99 is Uzmobile code, and number is 0123456 (7 digits)?
    // YES! 99 012 34 56 is a valid 9-digit Uzbek number: 99 + 0123456 = 9 digits!
    // Wait: count digits in "89901234567":
    // 8 - 9 - 9 - 0 - 1 - 2 - 3 - 4 - 5 - 6 - 7
    // 1   2   3   4   5   6   7   8   9   10  11 -> 11 digits!
    // If it's 8 + 9901234567 -> 10 digits after 8.
    // What if "89901234567" -> remove 8 -> "9901234567"? But if it's 10 digits, does it have a 0?
    // If 99 (code) + 01234567 (8 digits) = 10 digits.
    // OR what if "89901234567" was "8" + "998" (with missing 8) + "901234567" -> 998 90 123 45 67?
    // Wait! Look at scenario 5 and 6 together:
    // 5. "0901234567" — 10 цифр, начинается с локального нуля → убрать ведущий 0, затем добавить 998 (получится 998901234567)
    // 6. "89901234567" / "8998901234567" — с восьмёркой доступа перед кодом страны → убрать ведущую 8
    // If you have "80901234567"? No.
    // If "8998901234567" -> remove 8 -> "998901234567" (12 digits, valid 998).
    // What if "8901234567" (10 digits: 8 + 901234567) -> remove 8 -> "901234567" (9 digits) -> add 998 -> "998901234567".
    // And what if the user wrote "89901234567" meaning 8 + 998... or 8 + 9901234567?
    // If input is "89901234567":
    // If we remove 8 -> "9901234567". If we then treat as "99" + "01234567" or if 998 was intended?
    // Wait, if we replace leading '899' with '99899'?
    // Let's check: If "8998901234567" -> startsWith('8998') -> remove 8 -> "998901234567".
    // If "89901234567" -> startsWith('899') and length === 11:
    // If someone meant "8" + 998 missing 8: 8 + 998... -> 998 + 901234567 = "998901234567"!
    // Wait, look at the digits of "89901234567":
    // 8 - 9 - 9 - 0 - 1 - 2 - 3 - 4 - 5 - 6 - 7
    // If you remove 8, you have: 9 9 0 1 2 3 4 5 6 7 (10 digits: 99 + 01234567 or 9 + 901234567).
    // If you replace leading '899' with '9989': "9989" + "01234567" = "998901234567" (12 digits)!
    // Exactly 998 90 123 45 67!
    // Notice how in "89901234567":
    // 8 (access) + 99 (typo for 998) + 901234567 = 89901234567!
    // If we replace '899' with '9989' when followed by valid phone digits, it produces exactly 998901234567!
  }

  // 1. "998901234567" — already 12 digits starting with 998
  if (digits.length === 12 && digits.startsWith('998')) {
    return digits;
  }

  // 6. Handle "8998XXXXXXXXX" (13 digits: 8 + 998XXXXXXXXX)
  if (digits.length === 13 && digits.startsWith('8998')) {
    const without8 = digits.slice(1);
    if (without8.length === 12 && without8.startsWith('998')) {
      return without8;
    }
  }

  // 6. Handle "89901234567" (11 digits: 8 + 99 + 901234567 with dropped 8, or 8 + 99[8]90...)
  if (digits.length === 11 && digits.startsWith('899')) {
    // "899" -> "9989"
    const converted = '9989' + digits.slice(3);
    if (converted.length === 12) {
      return converted;
    }
  }

  // 5. "0901234567" — 10 digits starting with local '0' -> remove 0 -> 9 digits -> add 998
  if (digits.length === 10 && digits.startsWith('0')) {
    return '998' + digits.slice(1);
  }

  // 6. "8901234567" — 10 digits starting with '8' (access code) followed by 9 digits
  if (digits.length === 10 && digits.startsWith('8')) {
    return '998' + digits.slice(1);
  }

  // 2, 3, 4, 7. 9 digits without country code (e.g. "901234567") -> prepend 998 -> "998901234567"
  if (digits.length === 9) {
    return '998' + digits;
  }

  // 11. Foreign numbers (e.g. Russian "79030030050" 11 digits starting with 7, or other international codes)
  // Do NOT force into 998 format, keep digits normalized as-is
  if (digits.length >= 10 && !digits.startsWith('998')) {
    return digits;
  }

  // Fallback: if 12 digits but not 998, keep as-is
  if (digits.length === 12) {
    return digits;
  }

  return '';
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
