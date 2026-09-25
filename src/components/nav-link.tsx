'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname().startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'text-sm transition-colors hover:text-foreground',
        active ? 'font-medium text-foreground' : 'text-muted-foreground',
      )}
    >
      {children}
    </Link>
  );
}
