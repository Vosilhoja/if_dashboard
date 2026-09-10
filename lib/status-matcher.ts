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
 * Collapse repeated consecutive characters (e.g. "otkaaaz" -> "otkaz", "откааааз" -> "отказ")
 */
export function collapseRepeatedChars(text: string): string {
  if (!text) return '';
  return text.replace(/(.)\1+/gu, '$1');
}

/**
 * Transliterate Uzbek Cyrillic to Latin for phonetic unification
 */
export function transliterateCyrillicToLatin(str: string): string {
  if (!str) return '';
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'x', 'ҳ': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh',
    'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o',
    'қ': 'q', 'ғ': 'g'
  };
  return str.split('').map((c) => map[c] || c).join('');
}

/**
 * Normalize raw status/comment text:
 * Lowercase, normalize apostrophes/backticks, transliterate, and remove special characters.
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[`'’ʻʽ_]/g, ' ')
    .replace(/[^\w\sа-яёўқғҳ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Semantic core roots for each category that match even non-standard phrasing
 */
const SEMANTIC_CATEGORY_ROOTS: Record<string, string[]> = {
  declined: [
    'otkaz',
    'rad',
    'foydalan',
    'vaqt',
    'ochir',
    'uchir',
    'kerak',
    'xohla',
    'hohla',
    'istam',
    'otmen',
    'gaplash',
    'keragi',
    'бросил',
    'отказ',
    'нет времени',
  ],
  linkSent: [
    'silka',
    'yuboril',
    'yubordik',
    'sms',
    'havola',
    'отправлен',
    'ссылк',
  ],
  repeatSent: [
    'povtor',
    'qayta',
    'повтор',
    'кайта',
  ],
  alreadyRegistered: [
    'registratsiya',
    'botdan',
    'avval',
    'oldin',
    'royxat',
    'ulangan',
    'зарегистр',
    'уже',
  ],
  wrongPerson: [
    'boshqa',
    'notogri',
    'xato',
    'notugri',
    'adashgan',
    'не тот',
    'неправильн',
    'чужой',
  ],
};

/**
 * Intelligent category matching:
 * 1. Semantic root matching with character deduplication ("otkaaaz" -> "otkaz" -> matches declined)
 * 2. Transliteration matching (Cyrillic <-> Latin)
 * 3. Substring / phrase inclusion
 * 4. Word fuzzy matching with Levenshtein distance
 */
export function matchesCategory(
  rawText: string | null | undefined,
  category: StatusCategoryConfig
): boolean {
  if (!rawText) return false;
  const norm = normalizeText(rawText);
  if (!norm) return false;

  const latinNorm = transliterateCyrillicToLatin(norm);
  const collapsedNorm = collapseRepeatedChars(norm);
  const collapsedLatin = collapseRepeatedChars(latinNorm);

  // 1. Semantic root matching with character collapse (handles otkaaaz, rad ettttdi, etc.)
  const semanticRoots = SEMANTIC_CATEGORY_ROOTS[category.id];
  if (semanticRoots) {
    for (const root of semanticRoots) {
      if (
        norm.includes(root) ||
        latinNorm.includes(root) ||
        collapsedNorm.includes(root) ||
        collapsedLatin.includes(root)
      ) {
        return true;
      }
    }
  }

  // 2. Check phrase inclusion with variants
  for (const phrase of category.phrases) {
    const normPhrase = normalizeText(phrase);
    if (!normPhrase) continue;
    const collapsedPhrase = collapseRepeatedChars(normPhrase);
    const latinPhrase = transliterateCyrillicToLatin(normPhrase);

    // Direct containment on any normalized variant
    if (
      norm.includes(normPhrase) ||
      normPhrase.includes(norm) ||
      collapsedNorm.includes(collapsedPhrase) ||
      collapsedLatin.includes(collapsedPhrase) ||
      latinNorm.includes(latinPhrase)
    ) {
      return true;
    }

    // Fuzzy match on full phrase or words
    const maxDist = category.maxDistance ?? 2;
    if (Math.abs(collapsedLatin.length - collapsedPhrase.length) <= maxDist) {
      if (levenshteinDistance(collapsedLatin, collapsedPhrase) <= maxDist) {
        return true;
      }
    }

    // Check individual words
    if (!normPhrase.includes(' ')) {
      const words = collapsedLatin.split(' ');
      for (const word of words) {
        if (
          word.length >= 3 &&
          levenshteinDistance(word, collapsedPhrase) <= (word.length > 5 ? maxDist : 1)
        ) {
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

export function isAlreadyRegisteredStatus(
  rawStatusOrComment: string | null | undefined,
  categoryConfig?: StatusCategoryConfig
): boolean {
  return matchesCategory(rawStatusOrComment, categoryConfig || STATUS_CONFIG.alreadyRegistered);
}

export function isWrongPersonStatus(
  rawStatusOrComment: string | null | undefined,
  categoryConfig?: StatusCategoryConfig
): boolean {
  return matchesCategory(rawStatusOrComment, categoryConfig || STATUS_CONFIG.wrongPerson);
}
