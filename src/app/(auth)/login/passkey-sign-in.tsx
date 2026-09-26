'use client';

import { Fingerprint, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { finishPasskeySignIn } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { usePasskeysAvailable } from '@/hooks/use-passkeys-available';
import { passkeyErrorMessage } from '@/lib/auth/passkeys';
import { createClient } from '@/lib/supabase/client';

export function PasskeySignIn() {
  const available = usePasskeysAvailable();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (!available) return null;

  async function signIn() {
    setPending(true);
    setError(undefined);
    try {
      const { error: signInError } = await createClient().auth.signInWithPasskey();
      if (signInError) {
        const message = passkeyErrorMessage(signInError);
        if (message) console.warn('signInWithPasskey failed', { code: signInError.code });
        setError(message ?? undefined);
        return;
      }
      // Redirects to the dashboard, or returns why this account can't come in.
      const result = await finishPasskeySignIn();
      setError(result.error);
    } catch (caught) {
      setError(passkeyErrorMessage(caught) ?? undefined);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        oppure
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" onClick={signIn} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Fingerprint aria-hidden />}
        Entra con passkey
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
