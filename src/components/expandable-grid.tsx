'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

/** Grid of cards showing the first `initial` items, with a button for the rest. */
export function ExpandableGrid({
  items,
  initial = 15,
}: {
  items: React.ReactNode[];
  initial?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initial);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible}
      </div>
      {items.length > initial && (
        <Button variant="outline" className="self-center" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Mostra meno' : `Mostra tutti (${items.length})`}
        </Button>
      )}
    </div>
  );
}
