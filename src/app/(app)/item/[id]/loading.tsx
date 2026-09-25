import { Skeleton } from '@/components/ui/skeleton';

export default function ItemLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Caricamento del titolo">
      <Skeleton className="h-5 w-24" />
      <div className="grid gap-6 sm:grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
        <Skeleton className="aspect-2/3 w-48 sm:w-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
