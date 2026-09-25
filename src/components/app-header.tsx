import { LogOut } from 'lucide-react';
import Link from 'next/link';

import { signOut } from '@/actions/auth';
import { NavLink } from '@/components/nav-link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Scaffale
          </Link>
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/search">Cerca</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline">
            {email}
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
