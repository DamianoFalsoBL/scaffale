const ISBN13 = /^97[89]\d{10}$/;
const ISBN10 = /^\d{9}[\dX]$/;

function clean(value: string) {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

function isValidIsbn13(isbn: string) {
  if (!ISBN13.test(isbn)) {
    return false;
  }

  const sum = [...isbn].reduce((acc, digit, i) => acc + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

function isValidIsbn10(isbn: string) {
  if (!ISBN10.test(isbn)) {
    return false;
  }

  const sum = [...isbn].reduce(
    (acc, char, i) => acc + (char === 'X' ? 10 : Number(char)) * (10 - i),
    0,
  );
  return sum % 11 === 0;
}

/** Normalizes an ISBN-10 or ISBN-13 to a valid ISBN-13, or undefined. */
export function toIsbn13(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const isbn = clean(value);

  if (isValidIsbn13(isbn)) {
    return isbn;
  }

  if (!isValidIsbn10(isbn)) {
    return undefined;
  }

  const body = `978${isbn.slice(0, 9)}`;
  const sum = [...body].reduce((acc, digit, i) => acc + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

/** Open Library cover by ISBN; `default=false` makes missing covers 404 so the UI can fall back. */
export function openLibraryCoverByIsbn(isbn13: string, size: 'S' | 'M' | 'L' = 'M') {
  return `https://covers.openlibrary.org/b/isbn/${isbn13}-${size}.jpg?default=false`;
}
