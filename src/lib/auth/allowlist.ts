/**
 * An empty allowlist means "no restriction": access is then limited only by
 * Supabase having public sign-ups disabled.
 */
export function isEmailAllowed(email: string | null | undefined, allowlist: readonly string[]) {
  if (allowlist.length === 0) {
    return true;
  }

  return !!email && allowlist.includes(email.trim().toLowerCase());
}
