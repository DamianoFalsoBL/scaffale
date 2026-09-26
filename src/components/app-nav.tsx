'use client';

import { House, LibraryBig, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: House },
  { href: '/library', label: 'Libreria', icon: LibraryBig },
  { href: '/search', label: 'Cerca', icon: Search },
] as const;

function useIsActive() {
  const pathname = usePathname();
  // Detail pages belong to the library.
  return (href: string) =>
    pathname.startsWith(href) || (href === '/library' && pathname.startsWith('/item/'));
}

export function DesktopNav() {
  const isActive = useIsActive();

  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="Sezioni">
      {NAV_ITEMS.map(({ href, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-foreground',
              active
                ? 'font-medium text-foreground after:absolute after:inset-x-3 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-primary'
                : 'text-muted-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom tab bar on phones, like an installed app. */
export function MobileTabBar() {
  const isActive = useIsActive();

  return (
    <nav
      data-mobile-tabbar
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors',
                  active ? 'font-medium text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
