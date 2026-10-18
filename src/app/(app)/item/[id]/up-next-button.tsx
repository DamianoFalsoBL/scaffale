'use client';

import { BookmarkCheck, BookmarkPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { setUpNext } from '@/actions/library';
import { Button } from '@/components/ui/button';

/** "Metti tra i prossimi" toggle for a planned title in the library. */
export function UpNextButton({
  entryId,
  title,
  upNext,
}: {
  entryId: string;
  title: string;
  upNext: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(upNext);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const result = await setUpNext({ entryId, upNext: next });
      if (result.ok) {
        toast.success(next ? `“${title}” è tra i prossimi` : `“${title}” tolto dai prossimi`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={optimistic ? 'secondary' : 'outline'}
      aria-pressed={optimistic}
      disabled={pending}
      onClick={toggle}
    >
      {optimistic ? <BookmarkCheck aria-hidden /> : <BookmarkPlus aria-hidden />}
      {optimistic ? 'Tra i prossimi · togli' : 'Metti tra i prossimi'}
    </Button>
  );
}
