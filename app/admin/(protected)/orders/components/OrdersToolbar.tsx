"use client";

import { RefreshCw, Search, X } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
  shownCount: number;
  totalCount: number;
}

export function OrdersToolbar({
  search,
  onSearchChange,
  onRefresh,
  isRefreshing,
  shownCount,
  totalCount,
}: Props) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold text-stone-900">Orders</h1>
        <span className="text-sm text-stone-400">
          {shownCount} / {totalCount}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isRefreshing}
          title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search code, customer, contact, item"
            className="h-8 w-[280px] rounded-md border border-stone-200 bg-white py-1 pl-8 pr-7 text-sm text-stone-700 transition placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
