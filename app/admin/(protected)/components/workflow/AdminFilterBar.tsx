"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

interface AdminFilterBarProps {
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function AdminFilterBar({
  search = "",
  searchPlaceholder = "Search...",
  onSearchChange,
  filters,
  actions,
}: AdminFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      {onSearchChange ? (
        <div className="min-w-[220px] flex-1">
          <label className="sr-only" htmlFor="admin-workflow-search">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="admin-workflow-search"
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-9 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-700/10"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {filters ? <div className="flex flex-wrap items-end gap-2">{filters}</div> : null}
      {actions ? <div className="flex items-center gap-2 lg:ml-auto">{actions}</div> : null}
    </div>
  );
}
