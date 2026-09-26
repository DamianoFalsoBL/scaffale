import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Logo } from '@/components/logo';
import { ShelfIllustration } from '@/components/shelf-illustration';
import { ThemeToggle } from '@/components/theme-toggle';
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
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Logo className="lg:invisible" />
        <ThemeToggle />
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2">
        {/* Cover: only on large screens, the form stays the focus on phones. */}
        <div className="hidden flex-col gap-8 lg:flex">
          <Logo className="[&_svg]:size-8 [&>span:last-child]:text-3xl" />
          <div className="space-y-3">
            <h1 className="text-5xl leading-tight font-semibold">
              Tutto quello che guardi e leggi, in ordine.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Film visti, serie in corso, libri sul comodino: il tuo scaffale personale.
            </p>
          </div>
          <ShelfIllustration className="max-w-sm" />
        </div>

        <div className="mx-auto w-full max-w-sm rounded-md bg-card p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-semibold">Bentornato</h2>
            <p className="text-sm text-muted-foreground">
              Accedi con la tua email e la tua password.
            </p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
