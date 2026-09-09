import { STATUS_CONFIG, StatusCategoryConfig } from './status-config';

/**
 * Standard Levenshtein distance implementation
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalize raw status/comment text (lowercase, replace punctuation/apostrophes, collapse spaces)
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[`'’ʻʽ_]/g, ' ')
    .replace(/[^\w\sа-яё]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if the text matches any phrase in the category using:
 * 1. Substring / inclusion
 * 2. Word fuzzy matching (Levenshtein distance <= maxDistance)
 */
export function matchesCategory(
  rawText: string | null | undefined,
  category: StatusCategoryConfig
): boolean {
  if (!rawText) return false;
  const norm = normalizeText(rawText);
  if (!norm) return false;

  // Direct code match if specified
  if (category.codes && category.codes.includes(norm)) {
    return true;
  }

  // Check phrase inclusion
  for (const phrase of category.phrases) {
    const normPhrase = normalizeText(phrase);
    if (!normPhrase) continue;

    // Direct containment
    if (norm.includes(normPhrase) || normPhrase.includes(norm)) {
      return true;
    }

    // Fuzzy match on full phrase or words
    const maxDist = category.maxDistance ?? 2;
    if (Math.abs(norm.length - normPhrase.length) <= maxDist) {
      if (levenshteinDistance(norm, normPhrase) <= maxDist) {
        return true;
      }
    }

    // Check individual words if phrase is single word
    if (!normPhrase.includes(' ')) {
      const words = norm.split(' ');
      for (const word of words) {
        if (word.length >= 3 && levenshteinDistance(word, normPhrase) <= (word.length > 5 ? maxDist : 1)) {
          return true;
        }
      }
    }
  }

  return false;
}

export function isLinkSentStatus(
  rawStatusOrComment: string | null | undefined,
  categoryConfig?: StatusCategoryConfig
): boolean {
  return matchesCategory(rawStatusOrComment, categoryConfig || STATUS_CONFIG.linkSent);
}

export function isRepeatSentStatus(
  rawStatusOrComment: string | null | undefined,
  categoryConfig?: StatusCategoryConfig
): boolean {
  return matchesCategory(rawStatusOrComment, categoryConfig || STATUS_CONFIG.repeatSent);
}

export function isDeclinedStatus(
  rawStatusOrComment: string | null | undefined,
  categoryConfig?: StatusCategoryConfig
): boolean {
  return matchesCategory(rawStatusOrComment, categoryConfig || STATUS_CONFIG.declined);
}
