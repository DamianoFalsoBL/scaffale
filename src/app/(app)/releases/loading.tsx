import { MediaCardSkeleton } from '@/components/media-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReleasesLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Caricamento delle uscite">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>
      {Array.from({ length: 2 }, (_, day) => (
        <div key={day} className="flex flex-col gap-4">
          <Skeleton className="h-7 w-56" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
