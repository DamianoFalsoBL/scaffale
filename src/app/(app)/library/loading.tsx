import { MediaCardSkeleton } from '@/components/media-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LibraryLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Caricamento della libreria">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
