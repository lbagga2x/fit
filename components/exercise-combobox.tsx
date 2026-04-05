"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  library: string[];
  value: string;
  onChange: (name: string) => void;
};

export function ExerciseCombobox({ library, value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const trimmed = query.trim();

  const filtered = trimmed
    ? library.filter((n) => n.toLowerCase().includes(trimmed.toLowerCase()))
    : library;

  const exactMatch = library.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase()
  );

  // If the user typed something that exactly matches a library entry,
  // normalise the casing to the canonical library version
  const canonical = library.find(
    (n) => n.toLowerCase() === trimmed.toLowerCase()
  );

  function select(name: string) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  function handleChange(val: string) {
    setQuery(val);
    // Pass canonical name if it matches, otherwise pass as-is
    const canon = library.find((n) => n.toLowerCase() === val.trim().toLowerCase());
    onChange(canon ?? val);
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search or type a new exercise…"
          className={cn(
            "w-full h-11 pl-9 pr-3 rounded-md border border-input bg-background text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          )}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !trimmed && (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Start typing to search…
              </p>
            )}

            {filtered.map((name) => (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(name); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors"
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value === name ? "text-primary opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{name}</span>
              </button>
            ))}

            {/* "Add new" option — shown when the typed name isn't an exact match */}
            {trimmed && !exactMatch && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(trimmed); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left border-t border-border hover:bg-accent transition-colors text-primary"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  Add &ldquo;<strong>{trimmed}</strong>&rdquo; to library
                </span>
              </button>
            )}

            {filtered.length === 0 && trimmed && (
              <p className="px-4 py-2 text-xs text-muted-foreground">
                No matches — use &ldquo;Add to library&rdquo; above
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
