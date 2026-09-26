'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useActionState, useState } from 'react';

import { signInWithPassword, type LoginState } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: LoginState = { status: 'idle' };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const error = state.status === 'error' ? state.message : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="nome@esempio.it"
          defaultValue={state.status === 'error' ? state.email : undefined}
          aria-invalid={!!error}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-10"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>

      {error && (
        <p id="login-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Accedi
      </Button>
    </form>
  );
}
