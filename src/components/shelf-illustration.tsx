import { cn } from '@/lib/utils';

const SHELF_Y = 160;

// Spines in the media type colors plus paper tones: [height %, width, color class, tilt].
const SPINES: [number, number, string, number][] = [
  [78, 26, 'fill-book', 0],
  [92, 34, 'fill-foreground/80', 0],
  [70, 22, 'fill-primary', 0],
  [86, 30, 'fill-movie', 0],
  [64, 20, 'fill-muted-foreground/50', 0],
  [95, 36, 'fill-tv', 0],
  [74, 24, 'fill-foreground/60', 0],
  [88, 28, 'fill-book/80', 0],
  [60, 22, 'fill-primary/70', -12],
];

// Static layout, computed once: each spine starts where the previous one ends.
const LAYOUT = SPINES.reduce<
  { x: number; y: number; w: number; h: number; color: string; tilt: number }[]
>((acc, [heightPct, w, color, tilt]) => {
  const previous = acc.at(-1);
  const x = previous ? previous.x + previous.w + 3 : 8;
  const h = (heightPct / 100) * SHELF_Y;
  return [...acc, { x, y: SHELF_Y - h, w, h, color, tilt }];
}, []);

/** Decorative bookshelf drawn with the app's own palette. */
export function ShelfIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 180" className={cn('w-full', className)} aria-hidden>
      {LAYOUT.map(({ x, y, w, h, color, tilt }) => (
        <rect
          key={x}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={2}
          className={color}
          transform={tilt ? `rotate(${tilt} ${x + w} ${SHELF_Y})` : undefined}
        />
      ))}
      <rect x="0" y={SHELF_Y} width="300" height="8" rx="2" className="fill-foreground/80" />
      <rect x="10" y={SHELF_Y + 8} width="8" height="12" className="fill-foreground/60" />
      <rect x="282" y={SHELF_Y + 8} width="8" height="12" className="fill-foreground/60" />
    </svg>
  );
}
