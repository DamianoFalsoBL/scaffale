import { BookOpen, Film, Tv } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';

const MEDIA = [
  { label: 'Film', icon: Film },
  { label: 'Serie TV', icon: Tv },
  { label: 'Libri', icon: BookOpen },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <span className="text-lg font-semibold tracking-tight">Scaffale</span>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Scaffale</h1>
          <p className="text-muted-foreground">
            Il tuo tracker personale di film, serie TV e libri. Presto disponibile.
          </p>
        </div>
        <ul className="flex flex-wrap justify-center gap-3">
          {MEDIA.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-muted-foreground"
            >
              <Icon className="size-4" />
              {label}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
