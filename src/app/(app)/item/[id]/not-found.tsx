import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function ItemNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="font-medium">Questo titolo non è nella tua libreria.</p>
      <p className="text-sm text-muted-foreground">
        Forse l’hai rimosso, o il link non è corretto.
      </p>
      <Button asChild variant="outline">
        <Link href="/library">Vai alla libreria</Link>
      </Button>
    </div>
  );
}
