import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Accedi',
};

const ERROR_MESSAGES: Record<string, string> = {
  link_invalid: 'Il link non è valido o è scaduto. Richiedine uno nuovo.',
  other_browser:
    'Apri il link nello stesso browser in cui l’hai richiesto. Richiedine uno nuovo da qui.',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  if (await getCurrentUser()) {
    redirect('/dashboard');
  }

  const { error } = await searchParams;
  const initialError = typeof error === 'string' ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex justify-end px-4 py-3 sm:px-6">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Scaffale</CardTitle>
            <CardDescription>
              Accedi con la tua email: ti mandiamo un link, niente password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm initialError={initialError} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
