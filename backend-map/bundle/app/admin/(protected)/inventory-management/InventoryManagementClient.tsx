"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, Package, Calendar, Filter, X } from "lucide-react";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    (cents ?? 0) / 100
  );
}

type BatchRow = {
  batch_id: string;
  batch_code: string;
  created_at: string;
  note: string | null;
  distinct_products: number | null;
  total_units_received: number | null;
  total_cost_cents: number | null;
};

type LineRow = {
  batch_id: string;
  batch_code: string;
  product_id: string;
  product_name: string;
  qty_received: number;
  qty_remaining: number;
  unit_cost_cents: number;
  category: string | null;
  price_cents: number | null;
};

type TimeBucket = "Today" | "Yesterday" | "This week" | "Older";

function getTimeBucket(createdAtIso: string): TimeBucket {
  const d = new Date(createdAtIso);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const day = (now.getDay() + 6) % 7;
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - day);

  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  if (d >= startOfWeek) return "This week";
  return "Older";
}

export default function InventoryManagementClient({
  batches,
  lines,
}: {
  batches: BatchRow[];
  lines: LineRow[];
}) {
  const [query, setQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeBucket | "All">("All");
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const model = useMemo(() => {
    const q = query.trim().toLowerCase();

    const batchById = new Map<string, BatchRow>();
    for (const b of batches ?? []) batchById.set(b.batch_id, b);

    const catMap = new Map<string, Map<TimeBucket, Map<string, LineRow[]>>>();

    for (const l of lines ?? []) {
      const b = batchById.get(l.batch_id);
      if (!b) continue;

      const category = l.category || "Uncategorized";
      const tb = getTimeBucket(b.created_at);

      // Apply time filter
      if (activeTimeFilter !== "All" && tb !== activeTimeFilter) continue;

      const hit =
        !q ||
        (category ?? "").toLowerCase().includes(q) ||
        (l.product_name ?? "").toLowerCase().includes(q) ||
        (b.batch_code ?? "").toLowerCase().includes(q) ||
        (b.note ?? "").toLowerCase().includes(q);

      if (!hit) continue;

      if (!catMap.has(category)) catMap.set(category, new Map());
      const tbMap = catMap.get(category)!;

      if (!tbMap.has(tb)) tbMap.set(tb, new Map());
      const batchMap = tbMap.get(tb)!;

      if (!batchMap.has(l.batch_id)) batchMap.set(l.batch_id, []);
      batchMap.get(l.batch_id)!.push(l);
    }

    const categories = Array.from(catMap.entries())
      .map(([category, tbMap]) => {
        const buckets = (["Today", "Yesterday", "This week", "Older"] as TimeBucket[])
          .map((tb) => {
            const batchMap = tbMap.get(tb);
            if (!batchMap) return null;

            const batchesArr = Array.from(batchMap.entries())
              .map(([batchId, batchLines]) => {
                const b = batchById.get(batchId)!;

                let units = 0;
                let remaining = 0;
                let cost = 0;
                let revenue = 0;

                for (const x of batchLines) {
                  units += x.qty_received ?? 0;
                  remaining += x.qty_remaining ?? 0;
                  cost += (x.qty_received ?? 0) * (x.unit_cost_cents ?? 0);
                  revenue += (x.qty_received ?? 0) * (x.price_cents ?? 0);
                }

                return {
                  batch: b,
                  lines: batchLines.sort((a, b) => (a.product_name ?? "").localeCompare(b.product_name ?? "")),
                  totals: {
                    units,
                    remaining,
                    cost,
                    revenue,
                    profit: revenue - cost,
                  },
                };
              })
              .sort((a, b) => new Date(b.batch.created_at).getTime() - new Date(a.batch.created_at).getTime());

            return { tb, batches: batchesArr };
          })
          .filter(Boolean) as { tb: TimeBucket; batches: any[] }[];

        let catUnits = 0;
        let catRemaining = 0;
        let catCost = 0;
        let catRevenue = 0;

        for (const bucket of buckets) {
          for (const bx of bucket.batches) {
            catUnits += bx.totals.units;
            catRemaining += bx.totals.remaining;
            catCost += bx.totals.cost;
            catRevenue += bx.totals.revenue;
          }
        }

        return {
          category,
          buckets,
          totals: {
            units: catUnits,
            remaining: catRemaining,
            cost: catCost,
            revenue: catRevenue,
            profit: catRevenue - catCost,
          },
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category));

    return categories;
  }, [batches, lines, query, activeTimeFilter]);

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
    setExpandedBatch(null); // Collapse batch when switching category
  };

  const toggleBatch = (batchId: string) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
  };

  const timeFilters: Array<TimeBucket | "All"> = ["All", "Today", "Yesterday", "This week", "Older"];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Inventory Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Category-first view. Click on categories and batches to expand details.
            </p>
          </div>
          <Link
            href="/admin/inventory-management/receive"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 md:w-auto"
          >
            <Package size={18} />
            Receive Inventory
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search category, product, batch code, supplier note…"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-gray-100"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Time Filters - Horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:flex-wrap">
          <Filter size={16} className="hidden text-gray-500 md:block" />
          <span className="text-sm text-gray-500 md:hidden">Filter by time:</span>
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveTimeFilter(filter)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                activeTimeFilter === filter
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {model.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No inventory found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {query ? "Try a different search term" : "No inventory batches available"}
            </p>
          </div>
        ) : (
          model.map((cat) => (
            <div
              key={cat.category}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.category)}
                className="w-full px-4 py-4 text-left md:px-6 md:py-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Category
                        </div>
                        <div className="text-lg font-semibold text-gray-900">{cat.category}</div>
                      </div>
                      
                      {/* Stats - Responsive layout */}
                      <div className="flex flex-wrap gap-2">
                        <div className="rounded-lg bg-gray-50 px-3 py-1.5">
                          <div className="text-xs text-gray-500">Units</div>
                          <div className="font-semibold">{cat.totals.units}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-1.5">
                          <div className="text-xs text-gray-500">Remaining</div>
                          <div className="font-semibold">{cat.totals.remaining}</div>
                        </div>
                        <div className="rounded-lg bg-blue-50 px-3 py-1.5">
                          <div className="text-xs text-blue-600">Cost</div>
                          <div className="font-semibold text-blue-700">{peso(cat.totals.cost)}</div>
                        </div>
                        <div className="rounded-lg bg-green-50 px-3 py-1.5">
                          <div className="text-xs text-green-600">Profit</div>
                          <div className="font-semibold text-green-700">{peso(cat.totals.profit)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {expandedCategory === cat.category ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Category Content - Collapsible */}
              {expandedCategory === cat.category && (
                <div className="border-t border-gray-200 px-4 py-4 md:px-6">
                  {cat.buckets.length === 0 ? (
                    <div className="py-4 text-center text-sm text-gray-500">
                      No batches found in this category.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cat.buckets.map((bucket) => (
                        <div key={bucket.tb} className="rounded-xl border border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                            <Calendar size={16} className="text-gray-500" />
                            <div className="font-medium text-gray-800">{bucket.tb}</div>
                            <span className="ml-auto rounded-full bg-white px-2 py-1 text-xs font-medium">
                              {bucket.batches.length} batch{bucket.batches.length !== 1 ? "es" : ""}
                            </span>
                          </div>

                          <div className="space-y-3 p-4">
                            {bucket.batches.map((bx: any) => (
                              <div key={bx.batch.batch_id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                {/* Batch Header */}
                                <button
                                  onClick={() => toggleBatch(bx.batch.batch_id)}
                                  className="w-full px-4 py-3 text-left"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <div className="font-semibold text-gray-900 truncate">
                                              {bx.batch.batch_code}
                                            </div>
                                            {bx.batch.note && (
                                              <span className="hidden truncate text-sm text-gray-500 md:inline">
                                                • {bx.batch.note}
                                              </span>
                                            )}
                                          </div>
                                          <div className="mt-1 text-xs text-gray-500">
                                            {new Date(bx.batch.created_at).toLocaleDateString("en-PH", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </div>
                                          {bx.batch.note && (
                                            <div className="mt-1 text-sm text-gray-600 md:hidden">
                                              {bx.batch.note}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Batch Stats */}
                                        <div className="flex flex-wrap gap-2">
                                          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs">
                                            <span className="font-medium">{bx.totals.units}</span> units
                                          </div>
                                          <div className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                                            {peso(bx.totals.cost)}
                                          </div>
                                          <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                            {peso(bx.totals.profit)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      {expandedBatch === bx.batch.batch_id ? (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                </button>

                                {/* Batch Items - Collapsible */}
                                {expandedBatch === bx.batch.batch_id && (
                                  <div className="border-t border-gray-200">
                                    <div className="divide-y divide-gray-100">
                                      {bx.lines.map((l: LineRow) => {
                                        const lineCost = (l.qty_received ?? 0) * (l.unit_cost_cents ?? 0);
                                        const lineRevenue = (l.qty_received ?? 0) * (l.price_cents ?? 0);
                                        const lineProfit = lineRevenue - lineCost;

                                        return (
                                          <div
                                            key={l.product_id}
                                            className="px-4 py-3 hover:bg-gray-50"
                                          >
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                              <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                  {l.product_name}
                                                </div>
                                                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-500 md:flex md:gap-4">
                                                  <span>Received: <strong>{l.qty_received}</strong></span>
                                                  <span>Remaining: <strong>{l.qty_remaining}</strong></span>
                                                  <span>Unit cost: <strong>{peso(l.unit_cost_cents)}</strong></span>
                                                  <span>Price: <strong>{peso(l.price_cents ?? 0)}</strong></span>
                                                </div>
                                              </div>
                                              
                                              {/* Line Stats */}
                                              <div className="flex flex-wrap gap-2">
                                                <div className="rounded-full bg-gray-100 px-3 py-1 text-xs">
                                                  Cost: {peso(lineCost)}
                                                </div>
                                                <div className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                                                  Rev: {peso(lineRevenue)}
                                                </div>
                                                <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                  Profit: {peso(lineProfit)}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-gray-100 p-2">
            <Package size={16} className="text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Note about profit calculation</p>
            <p className="mt-1 text-xs text-gray-600">
              Profit shown is an estimate (price minus batch unit cost for received quantity).
              Realized profit is still calculated from paid orders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}