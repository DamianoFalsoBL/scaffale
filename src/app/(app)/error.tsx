'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center" role="alert">
      <AlertCircle className="size-10 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">Qualcosa è andato storto</p>
        <p className="text-sm text-muted-foreground">
          Non è stato possibile caricare questa pagina. Riprova tra qualche istante.
        </p>
      </div>
      <Button variant="outline" onClick={() => retry()}>
        <RotateCcw aria-hidden />
        Riprova
      </Button>
    </div>
  );
}
