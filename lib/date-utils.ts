/**
 * Safe date parser and range checker for Google Sheets dates
 * Typically dates are formatted as DD.MM.YYYY or DD.MM.YYYY HH:mm:ss or YYYY-MM-DD
 */

export function parseSheetDate(rawDate: string | number | Date | null | undefined): Date | null {
  if (!rawDate) return null;
  if (rawDate instanceof Date) {
    return isNaN(rawDate.getTime()) ? null : rawDate;
  }

  const str = String(rawDate).trim();
  if (!str) return null;

  // Handle DD.MM.YYYY or DD.MM.YYYY HH:mm:ss or DD.MM.YYYY HH:mm
  // e.g. 30.06.2026, 01.05.2026 9:13
  const dotParts = str.split(' ')[0].split('.');
  if (dotParts.length === 3) {
    const day = parseInt(dotParts[0], 10);
    const month = parseInt(dotParts[1], 10) - 1; // 0-indexed
    let year = parseInt(dotParts[2], 10);
    if (year < 100) year += 2000;

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Handle YYYY-MM-DD
  const dashParts = str.split('T')[0].split('-');
  if (dashParts.length === 3 && dashParts[0].length === 4) {
    const year = parseInt(dashParts[0], 10);
    const month = parseInt(dashParts[1], 10) - 1;
    const day = parseInt(dashParts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Fallback to Date.parse
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  return null;
}

export function isDateInRange(
  targetDate: Date | null,
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined
): boolean {
  if (!targetDate) return false;

  const targetTime = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();

  if (startDateStr) {
    const start = parseSheetDate(startDateStr);
    if (start) {
      const startTime = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      ).getTime();
      if (targetTime < startTime) return false;
    }
  }

  if (endDateStr) {
    const end = parseSheetDate(endDateStr);
    if (end) {
      const endTime = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      ).getTime();
      if (targetTime > endTime) return false;
    }
  }

  return true;
}

export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateToDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? parseSheetDate(date) : date;
  if (!d) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
