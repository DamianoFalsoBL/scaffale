'use client';

import { Check } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { saveStreamingProviders } from '@/actions/settings';
import { Button } from '@/components/ui/button';
import { WATCH_PROVIDERS, type WatchProviderSlug } from '@/lib/catalogs';
import { cn } from '@/lib/utils';

/** "Le mie piattaforme": toggle the services the user subscribes to, then save. */
export function StreamingSettings({ initial }: { initial: WatchProviderSlug[] }) {
  const [saved, setSaved] = useState(initial);
  const [selected, setSelected] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = selected.length !== saved.length || selected.some((slug) => !saved.includes(slug));

  function toggle(slug: WatchProviderSlug) {
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveStreamingProviders(selected);
      if (result.ok) {
        setSaved(result.data.streamingProviders);
        setSelected(result.data.streamingProviders);
        toast.success(
          result.data.streamingProviders.length > 0
            ? 'Piattaforme salvate'
            : 'Nessuna piattaforma scelta',
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2">
        {WATCH_PROVIDERS.map((provider) => {
          const on = selected.includes(provider.slug);
          return (
            <li key={provider.slug}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(provider.slug)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-11 pointer-coarse:px-4',
                  on
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-accent',
                )}
              >
                {on && <Check className="size-4" aria-hidden />}
                {provider.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div>
        <Button type="button" onClick={save} disabled={!dirty || pending}>
          Salva piattaforme
        </Button>
      </div>
    </div>
  );
}
