import { LogOut } from 'lucide-react';
import Link from 'next/link';

import { signOut } from '@/actions/auth';
import { DesktopNav } from '@/components/app-nav';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export function AppHeader({ name, email }: { name: string; email: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Scaffale, vai alla home"
          >
            <Logo />
          </Link>
          <DesktopNav />
        </div>
        <div className="flex items-center gap-1">
          <span
            className="mr-2 hidden max-w-40 truncate text-sm text-muted-foreground sm:inline"
            title={email}
          >
            {name}
          </span>
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Esci" title="Esci">
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
