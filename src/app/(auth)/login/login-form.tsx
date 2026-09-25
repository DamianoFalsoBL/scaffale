'use client';

import { Loader2, MailCheck } from 'lucide-react';
import { useActionState } from 'react';

import { signInWithMagicLink, type LoginState } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: LoginState = { status: 'idle' };

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState(signInWithMagicLink, initialState);

  if (state.status === 'sent') {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <MailCheck className="size-10 text-muted-foreground" aria-hidden />
        <p className="font-medium">Controlla la tua email</p>
        <p className="text-sm text-muted-foreground">
          Se <span className="font-medium text-foreground">{state.email}</span> è autorizzato,
          riceverai un link per accedere. Il link scade dopo un’ora.
        </p>
      </div>
    );
  }

  const error = state.status === 'error' ? state.message : initialError;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nome@esempio.it"
          defaultValue={state.status === 'error' ? state.email : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? 'email-error' : undefined}
          required
        />
        {error && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Inviami il link di accesso
      </Button>
    </form>
  );
}
