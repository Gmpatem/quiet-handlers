"use client";


import Link from "next/link";
import { useMemo, useState } from "react";

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

  // start of week (Mon): adjust so Monday is 0
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

  const model = useMemo(() => {
    const q = query.trim().toLowerCase();

    const batchById = new Map<string, BatchRow>();
    for (const b of batches ?? []) batchById.set(b.batch_id, b);

    // category -> timeBucket -> batchId -> lines[]
    const catMap = new Map<string, Map<TimeBucket, Map<string, LineRow[]>>>();

    for (const l of lines ?? []) {
      const b = batchById.get(l.batch_id);
      if (!b) continue;

      const category = l.category || "Uncategorized";
      const tb = getTimeBucket(b.created_at);

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

    // Convert to arrays with stable ordering
    const categories = Array.from(catMap.entries())
      .map(([category, tbMap]) => {
        const buckets = (["Today", "Yesterday", "This week", "Older"] as TimeBucket[])
          .map((tb) => {
            const batchMap = tbMap.get(tb);
            if (!batchMap) return null;

            const batchesArr = Array.from(batchMap.entries())
              .map(([batchId, batchLines]) => {
                const b = batchById.get(batchId)!;

                // category-specific totals (computed from lines)
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

        // category totals (sum across buckets)
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
  }, [batches, lines, query]);

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold">Inventory Management</h1>
        <div className="mt-3">
          <Link
            href="/admin/inventory-management/receive"
            className="inline-flex rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            + Receive Inventory
          </Link>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Category-first view. Each restock = one batch code. Batches can appear under multiple categories with filtered lines.
        </p>
      </div>

      <div className="mt-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search category, product, batch code, supplier note…"
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
        />
      </div>

      <div className="mt-6 space-y-4">
        {model.map((cat) => (
          <details key={cat.category} className="rounded-2xl border border-stone-200 bg-white">
            <summary className="cursor-pointer list-none px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Category</div>
                  <div className="text-lg font-semibold text-stone-900">{cat.category}</div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">Units: {cat.totals.units}</span>
                  <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">Remaining: {cat.totals.remaining}</span>
                  <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">Cost: {peso(cat.totals.cost)}</span>
                  <span className="rounded-full bg-stone-900 px-3 py-1 font-semibold text-white">
                    Est. Profit: {peso(cat.totals.profit)}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-xs text-stone-500">Click to expand batches by time</div>
            </summary>

            <div className="border-t border-stone-200 px-5 py-4">
              {cat.buckets.length === 0 ? (
                <div className="text-sm text-stone-600">No batches found in this category.</div>
              ) : (
                <div className="space-y-4">
                  {cat.buckets.map((bucket) => (
                    <div key={bucket.tb} className="rounded-2xl border border-stone-200">
                      <div className="border-b border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-800">
                        {bucket.tb}
                      </div>

                      <div className="p-4 space-y-3">
                        {bucket.batches.map((bx: any) => (
                          <details key={bx.batch.batch_id} className="rounded-2xl border border-stone-200">
                            <summary className="cursor-pointer list-none px-4 py-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="text-xs text-stone-500">Batch</div>
                                  <div className="font-semibold text-stone-900">{bx.batch.batch_code}</div>
                                  <div className="mt-1 text-xs text-stone-500">
                                    {new Date(bx.batch.created_at).toLocaleString()}{" "}
                                    {bx.batch.note ? `• ${bx.batch.note}` : ""}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">
                                    Units: {bx.totals.units}
                                  </span>
                                  <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">
                                    Remaining: {bx.totals.remaining}
                                  </span>
                                  <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">
                                    Cost: {peso(bx.totals.cost)}
                                  </span>
                                  <span className="rounded-full bg-stone-900 px-3 py-1 font-semibold text-white">
                                    Profit: {peso(bx.totals.profit)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 text-xs text-stone-500">Click to view items</div>
                            </summary>

                            <div className="border-t border-stone-200">
                              <div className="divide-y divide-stone-100">
                                {bx.lines.map((l: LineRow) => {
                                  const lineCost = (l.qty_received ?? 0) * (l.unit_cost_cents ?? 0);
                                  const lineRevenue = (l.qty_received ?? 0) * (l.price_cents ?? 0);
                                  const lineProfit = lineRevenue - lineCost;

                                  return (
                                    <div
                                      key={l.product_id}
                                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div>
                                        <div className="font-medium text-stone-900">{l.product_name}</div>
                                        <div className="text-xs text-stone-500">
                                          Received {l.qty_received} • Remaining {l.qty_remaining} • Unit cost{" "}
                                          {peso(l.unit_cost_cents)} • Price {peso(l.price_cents ?? 0)}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">
                                          Cost: {peso(lineCost)}
                                        </span>
                                        <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">
                                          Revenue: {peso(lineRevenue)}
                                        </span>
                                        <span className="rounded-full bg-stone-900 px-3 py-1 font-semibold text-white">
                                          Profit: {peso(lineProfit)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </details>
                        ))}

                        {bucket.batches.length === 0 && (
                          <div className="text-sm text-stone-600">No batches in this time bucket.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        ))}

        {model.length === 0 && (
          <div className="rounded-2xl border border-stone-200 p-6 text-stone-600">
            No inventory batches found for your search.
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-stone-500">
        Note: Profit here is an estimate (price minus batch unit cost for received qty). Realized profit is still from paid orders.
      </p>
    </div>
  );
}


