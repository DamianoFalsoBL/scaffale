'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/** Goes back to where the user came from (e.g. the search results), or to `fallback`. */
export function BackLink({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="inline-flex cursor-pointer items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </button>
  );
}
