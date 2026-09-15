import type { ReactNode } from "react";

// Wraps a card in a small folder-tab shape sticking up from its top-left edge — like an index
// card in a recipe box. The tab sits in reserved padding above the card (not overlapping it),
// so no z-index/stacking is needed to keep it looking attached rather than floating.
export function TabbedCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className="relative pt-5">
      <div className="absolute top-0 left-4 w-14 h-5 bg-terracotta-300 rounded-t-md" aria-hidden="true" />
      <div className={className}>{children}</div>
    </div>
  );
}
