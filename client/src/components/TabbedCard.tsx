import type { ReactNode } from "react";

// Wraps a card in a small folder-tab shape sticking up from its top-left edge — like an index
// card in a recipe box. The tab matches the card's own fill and border exactly (no bottom
// border of its own) and overlaps 1px down into the card, so its white fill paints over that
// stretch of the card's top border — the two pieces read as one continuous outlined shape
// rather than a separately-colored tab sitting on top of a bordered card. Both need matching
// bg/border classes to the card passed via `className`, not just default styling here.
export function TabbedCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className="relative pt-5">
      <div className="absolute top-0 left-4 w-14 h-[21px] bg-white border border-b-0 border-gray-200 rounded-t-lg" aria-hidden="true" />
      <div className={className}>{children}</div>
    </div>
  );
}
