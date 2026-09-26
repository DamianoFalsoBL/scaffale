'use client';

import { CheckCircle2 } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const STANDALONE = '(display-mode: standalone)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(STANDALONE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** True inside the installed app (Safari on iPhone exposes navigator.standalone instead). */
function useStandalone() {
  return useSyncExternalStore(
    subscribe,
    () =>
      window.matchMedia(STANDALONE).matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
}

export function InstallHelp() {
  const standalone = useStandalone();

  if (standalone) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-tv" aria-hidden />
        Stai già usando l&apos;app installata.
      </p>
    );
  }

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <Step title="iPhone e iPad">
        In Safari tocca Condividi, poi &ldquo;Aggiungi alla schermata Home&rdquo;.
      </Step>
      <Step title="Android">
        In Chrome apri il menu ⋮ e scegli &ldquo;Installa app&rdquo; (o &ldquo;Aggiungi a schermata
        Home&rdquo;).
      </Step>
      <Step title="Computer">
        In Chrome o Edge usa l&apos;icona di installazione a destra nella barra degli indirizzi.
      </Step>
    </dl>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="mb-1 font-medium">{title}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  );
}
