function capitalize(word: string) {
  return word ? word[0]!.toLocaleUpperCase('it') + word.slice(1).toLocaleLowerCase('it') : word;
}

/**
 * First name to greet the user with: the account's display name if set,
 * otherwise the first part of the email ("damiano.falso@…" → "Damiano").
 */
export function displayName(email: string, metadata?: Record<string, unknown>): string {
  for (const key of ['display_name', 'full_name', 'name']) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().split(/\s+/)[0]!;
    }
  }
  const localPart = email.split('@')[0] ?? '';
  return capitalize(localPart.split(/[._+-]/)[0] ?? '') || email;
}
