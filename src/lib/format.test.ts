import { describe, expect, it } from 'vitest';

import { formatAuthorName, formatAuthors, formatDate, formatStars } from './format';

describe('formatAuthorName', () => {
  it('reorders "Surname, Name" and fixes all-caps names', () => {
    expect(formatAuthorName('CHATTERJEE, AMIT')).toBe('Amit Chatterjee');
    expect(formatAuthorName('Eco, Umberto')).toBe('Umberto Eco');
    expect(formatAuthorName("O'BRIEN")).toBe("O'Brien");
  });

  it('leaves normal names alone', () => {
    expect(formatAuthorName('George Jennings Hinde')).toBe('George Jennings Hinde');
    expect(formatAuthorName('AA.VV')).toBe('AA.VV');
  });
});

describe('formatAuthors', () => {
  it('builds an Italian byline', () => {
    expect(formatAuthors([])).toBe('');
    expect(formatAuthors(['Frank Herbert'])).toBe('di Frank Herbert');
    expect(formatAuthors(['Frank Herbert', 'Brian Herbert'])).toBe(
      'di Frank Herbert e Brian Herbert',
    );
    expect(formatAuthors(['A', 'B', 'C'])).toBe('di A, B e altri');
  });
});

describe('formatDate and formatStars', () => {
  it('formats dates and half stars in Italian', () => {
    expect(formatDate('2026-09-25')).toBe('25 set 2026');
    expect(formatDate(null)).toBeUndefined();
    expect(formatStars(9)).toBe('4,5');
    expect(formatStars(8)).toBe('4');
  });
});
