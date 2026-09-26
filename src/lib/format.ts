const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-09-25" → "25 set 2026". Date-only strings are read as UTC to avoid day shifts. */
export function formatDate(isoDate: string | null | undefined) {
  return isoDate ? dateFormatter.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)) : undefined;
}

/** Stored rating 1–10 → "3,5". */
export function formatStars(rating: number) {
  return (rating / 2).toLocaleString('it-IT', { maximumFractionDigits: 1 });
}

/** "CHATTERJEE, AMIT" → "Amit Chatterjee"; "Eco, Umberto" → "Umberto Eco". */
export function formatAuthorName(name: string) {
  const parts = name
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  let result = parts.length === 2 ? `${parts[1]} ${parts[0]}` : name.trim();

  // Abbreviations like "AA.VV" (various authors) stay as they are.
  const isAbbreviation = /^[\p{Lu}.]+$/u.test(result) && result.includes('.');
  if (!isAbbreviation && result === result.toUpperCase() && /\p{Lu}/u.test(result)) {
    result = result
      .toLowerCase()
      .replace(
        /(^|[\s'’-])(\p{L})/gu,
        (_, before: string, letter: string) => before + letter.toUpperCase(),
      );
  }
  return result;
}

/** "di Frank Herbert e Brian Herbert", "di A, B e altri"; empty string without authors. */
export function formatAuthors(authors: readonly string[]) {
  const names = authors.map(formatAuthorName).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return `di ${names[0]}`;
  if (names.length === 2) return `di ${names[0]} e ${names[1]}`;
  return `di ${names[0]}, ${names[1]} e altri`;
}

/** "Buongiorno" / "Buon pomeriggio" / "Buonasera" for the hour in Rome. */
export function greeting(now = new Date(), timeZone = 'Europe/Rome') {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now),
  );
  if (hour >= 5 && hour < 13) return 'Buongiorno';
  if (hour >= 13 && hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}
