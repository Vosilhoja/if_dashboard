import { describe, expect, it } from 'vitest';
import { STATUS_CONFIG } from './status-config';
import {
  collapseRepeatedChars,
  levenshteinDistance,
  matchesCategory,
  normalizeText,
} from './status-matcher';

describe('status matcher utilities', () => {
  it('normalizes text', () => {
    expect(normalizeText('  OTKAZ  ')).toBe('otkaz');
  });

  it('collapses repeated characters', () => {
    expect(collapseRepeatedChars('otkaaaz')).toBe('otkaz');
  });

  it('calculates Levenshtein distance', () => {
    expect(levenshteinDistance('otkaz', 'otkaz')).toBe(0);
    expect(levenshteinDistance('otkaz', 'otkas')).toBe(1);
  });
});

describe('declined status matching', () => {
  it('matches an explicit refusal', () => {
    expect(matchesCategory('otkaz qildi', STATUS_CONFIG.declined)).toBe(true);
  });

  it('matches a compound unavailable-time phrase', () => {
    expect(matchesCategory("vaqti yo'q, band", STATUS_CONFIG.declined)).toBe(true);
  });

  it('does not classify positive wording with kerak as declined', () => {
    expect(matchesCategory('menga kerak, qachon boshlanadi?', STATUS_CONFIG.declined)).toBe(false);
    expect(matchesCategory("ha albatta kerak bo'ladi", STATUS_CONFIG.declined)).toBe(false);
  });
});
