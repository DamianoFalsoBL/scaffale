'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Horizontal shelf of cards. Touch and trackpads scroll it natively; on desktop two
 * arrow buttons page through it (smooth unless the user prefers reduced motion).
 */
export function Shelf({
  title,
  href,
  count,
  children,
}: {
  title: string;
  href?: string;
  count?: number;
  children: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    el.addEventListener('scroll', updateEdges, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', updateEdges);
    };
  }, [updateEdges]);

  function page(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex items-end justify-between gap-4 border-b pb-2">
        <h2 className="text-xl font-semibold">
          {title}
          {count !== undefined && (
            <span className="ml-2 align-middle font-sans text-sm font-normal text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 sm:flex">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Precedenti"
              disabled={edges.start}
              onClick={() => page(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Successivi"
              disabled={edges.end}
              onClick={() => page(1)}
            >
              <ChevronRight />
            </Button>
          </div>
          {href && (
            <Link
              href={href}
              className="ml-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Vedi tutti
            </Link>
          )}
        </div>
      </div>
      <div
        ref={scroller}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:thin] gap-4 overflow-x-auto px-4 pt-1 pb-3 sm:-mx-6 sm:scroll-px-6 sm:px-6"
      >
        {children}
      </div>
    </section>
  );
}
