import type { ReactNode } from "react";

// Wraps a card in a small folder-tab shape sticking up from its top-left edge — like an index
// card in a recipe box. The tab has no border of its own (just the card's matching white fill),
// and overlaps 1px down into the card so that fill paints over that stretch of the card's own
// top border — the two pieces read as one continuous shape rather than a separately-outlined
// tab sitting on top of a bordered card. `className` (the card) supplies the matching bg color.
export function TabbedCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className="relative pt-5">
      <div className="absolute top-0 left-4 w-14 h-[21px] bg-white rounded-t-lg" aria-hidden="true" />
      <div className={className}>{children}</div>
    </div>
  );
}
