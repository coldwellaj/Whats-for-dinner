import { useEffect, useState } from "react";

export type ViewMode = "tile" | "list";

export function useViewMode(storageKey: string): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(storageKey) === "list" ? "list" : "tile";
    } catch {
      return "tile";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, viewMode);
    } catch {
      // per-viewer convenience only; fine if it can't persist
    }
  }, [storageKey, viewMode]);

  return [viewMode, setViewMode];
}

function TileIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="2" width="14" height="2.5" rx="1" />
      <rect x="1" y="6.75" width="14" height="2.5" rx="1" />
      <rect x="1" y="11.5" width="14" height="2.5" rx="1" />
    </svg>
  );
}

export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex gap-1 ml-auto">
      <button
        type="button"
        onClick={() => onChange("tile")}
        aria-label="Tile view"
        aria-pressed={value === "tile"}
        title="Tile view"
        className={`p-2 rounded ${
          value === "tile" ? "bg-terracotta-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        <TileIcon />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={value === "list"}
        title="List view"
        className={`p-2 rounded ${
          value === "list" ? "bg-terracotta-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        <ListIcon />
      </button>
    </div>
  );
}
