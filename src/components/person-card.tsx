import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function PersonAvatar({
  name,
  profileUrl,
  className,
}: {
  name: string;
  profileUrl?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-2/3 overflow-hidden rounded-[3px] bg-secondary shadow-sm ring-1 ring-foreground/10',
        className,
      )}
    >
      {profileUrl ? (
        <Image src={profileUrl} alt="" fill sizes="160px" unoptimized className="object-cover" />
      ) : (
        <span
          className="flex size-full items-center justify-center font-heading text-2xl text-muted-foreground"
          aria-hidden
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}

/** A person (cast, crew or search result) linking to their page. */
export function PersonCard({
  id,
  name,
  profileUrl,
  detail,
  className,
}: {
  id: number;
  name: string;
  profileUrl?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/person/${id}`}
      className={cn(
        'group flex flex-col gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        className,
      )}
    >
      <PersonAvatar
        name={name}
        profileUrl={profileUrl}
        className="transition-transform duration-200 motion-safe:group-hover:-translate-y-1"
      />
      <div className="min-w-0">
        <p className="line-clamp-2 font-heading text-sm leading-snug font-medium group-hover:underline">
          {name}
        </p>
        {detail && <p className="line-clamp-2 text-xs text-muted-foreground">{detail}</p>}
      </div>
    </Link>
  );
}
