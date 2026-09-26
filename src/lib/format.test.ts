import { describe, expect, it } from 'vitest';

import { formatAuthorName, formatAuthors, formatDate, formatStars, greeting } from './format';

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

describe('greeting', () => {
  it('follows the time of day in Rome', () => {
    expect(greeting(new Date('2026-09-26T06:00:00Z'))).toBe('Buongiorno'); // 08:00 in Rome
    expect(greeting(new Date('2026-09-26T13:30:00Z'))).toBe('Buon pomeriggio'); // 15:30
    expect(greeting(new Date('2026-09-26T19:00:00Z'))).toBe('Buonasera'); // 21:00
    expect(greeting(new Date('2026-09-26T01:00:00Z'))).toBe('Buonasera'); // 03:00
  });
});
