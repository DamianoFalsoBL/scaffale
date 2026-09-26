import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Accedi',
};

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex justify-end px-4 py-3 sm:px-6">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Scaffale</CardTitle>
            <CardDescription>Accedi con la tua email e la tua password.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
