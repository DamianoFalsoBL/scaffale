import { MediaCardSkeleton } from '@/components/media-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-10" aria-busy aria-label="Caricamento della dashboard">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-36 shrink-0 sm:w-40">
                <MediaCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
