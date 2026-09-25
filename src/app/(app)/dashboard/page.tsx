import { BookOpen, Film, Tv } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const MEDIA = [
  { label: 'Film', icon: Film },
  { label: 'Serie TV', icon: Tv },
  { label: 'Libri', icon: BookOpen },
] as const;

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          La tua libreria è ancora vuota. Ricerca e aggiunta dei titoli arrivano presto.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {MEDIA.map(({ label, icon: Icon }) => (
          <li key={label} className="flex items-center gap-3 rounded-lg border p-4">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
            <span className="font-medium">{label}</span>
            <span className="ml-auto text-sm text-muted-foreground">0</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
