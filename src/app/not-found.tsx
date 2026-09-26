import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-5xl font-semibold tracking-tight text-muted-foreground">404</p>
      <div className="space-y-1">
        <p className="font-medium">Pagina non trovata</p>
        <p className="text-sm text-muted-foreground">
          Il link potrebbe essere sbagliato o la pagina non esiste più.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Torna a Scaffale</Link>
      </Button>
    </main>
  );
}
