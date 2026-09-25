import { describe, expect, it } from 'vitest';

import { openLibraryCoverByIsbn, toIsbn13 } from './isbn';

describe('toIsbn13', () => {
  it('keeps valid ISBN-13s, stripping separators', () => {
    expect(toIsbn13('978-88-452-1066-2')).toBe('9788845210662');
  });

  it('converts ISBN-10 to ISBN-13', () => {
    // Il nome della rosa (Bompiani)
    expect(toIsbn13('8845207056')).toBe('9788845207051');
    expect(toIsbn13('0-306-40615-2')).toBe('9780306406157');
  });

  it('handles an X check digit', () => {
    expect(toIsbn13('080442957X')).toBe('9780804429573');
  });

  it('rejects invalid values', () => {
    expect(toIsbn13('9788845210663')).toBeUndefined(); // bad checksum
    expect(toIsbn13('1234')).toBeUndefined();
    expect(toIsbn13('')).toBeUndefined();
    expect(toIsbn13(undefined)).toBeUndefined();
  });
});

describe('openLibraryCoverByIsbn', () => {
  it('builds a cover URL that 404s when missing', () => {
    expect(openLibraryCoverByIsbn('9788845210662')).toBe(
      'https://covers.openlibrary.org/b/isbn/9788845210662-M.jpg?default=false',
    );
  });
});
