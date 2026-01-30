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
  distinct_products: number;
  total_units_received: number;
  total_cost_cents: number;
};

type BatchLineRow = {
  batch_id: string;
  batch_code: string;
  product_id: string;
  product_name: string;
  category: string | null;
  qty_received: number;
  qty_remaining: number;
  unit_cost_cents: number;
  price_cents: number | null;
};

export default function InventoryClient({
  batches,
  lines,
}: {
  batches: BatchRow[];
  lines: BatchLineRow[];
}) {
  const [query, setQuery] = useState("");

  const byBatch = useMemo(() => {
    const q = query.trim().toLowerCase();

    const map = new Map<string, { batch: BatchRow; lines: BatchLineRow[] }>();
    for (const b of batches ?? []) {
      map.set(b.batch_id, { batch: b, lines: [] });
    }

    for (const l of lines ?? []) {
      const hit =
        !q ||
        (l.product_name ?? "").toLowerCase().includes(q) ||
        (l.category ?? "").toLowerCase().includes(q) ||
        (l.batch_code ?? "").toLowerCase().includes(q);

      if (!hit) continue;

      const slot = map.get(l.batch_id);
      if (slot) slot.lines.push(l);
    }

    // Only show batches that have lines after filtering (or show empty batch if no query)
    const result: { batch: BatchRow; lines: BatchLineRow[] }[] = [];
    for (const slot of map.values()) {
      if (q && slot.lines.length === 0) continue;
      result.push(slot);
    }

    return result;
  }, [batches, lines, query]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Inventory Manager</h1>
          <p className="mt-1 text-sm text-slate-600">
            View inventory by batch and category. This is your “stock story” in chapters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            ← Back to Products
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search batch code, product, or category…"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2"
        />
      </div>

      <div className="mt-6 space-y-4">
        {byBatch.map(({ batch, lines }) => (
          <BatchCard key={batch.batch_id} batch={batch} lines={lines} />
        ))}

        {!byBatch.length && (
          <div className="rounded-2xl border border-slate-200 p-6 text-slate-600">
            No batches match your search.
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Tip: This page is for inventory organization and estimation. Realized profit comes from paid orders.
      </p>
    </div>
  );
}

function BatchCard({ batch, lines }: { batch: BatchRow; lines: BatchLineRow[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, BatchLineRow[]>();
    for (const l of lines) {
      const key = l.category || "Uncategorized";
      m.set(key, [...(m.get(key) ?? []), l]);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [lines]);

  const totals = useMemo(() => {
    let received = 0;
    let remaining = 0;
    let cost = 0;
    let potentialRevenue = 0;

    for (const l of lines) {
      received += l.qty_received ?? 0;
      remaining += l.qty_remaining ?? 0;
      cost += (l.qty_received ?? 0) * (l.unit_cost_cents ?? 0);

      const p = l.price_cents ?? 0;
      potentialRevenue += (l.qty_received ?? 0) * p;
    }

    const potentialProfit = potentialRevenue - cost;
    return { received, remaining, cost, potentialRevenue, potentialProfit };
  }, [lines]);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm text-slate-500">Batch</div>
            <div className="text-lg font-semibold">{batch.batch_code}</div>
            <div className="mt-1 text-xs text-slate-500">
              {new Date(batch.created_at).toLocaleString()} {batch.note ? "• " + batch.note : ""}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Units received" value={String(totals.received)} />
            <Stat label="Remaining" value={String(totals.remaining)} />
            <Stat label="Batch cost" value={peso(totals.cost)} />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Potential revenue</div>
            <div className="mt-1 font-semibold">{peso(totals.potentialRevenue)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Potential profit</div>
            <div className="mt-1 font-semibold">{peso(totals.potentialProfit)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Categories</div>
            <div className="mt-1 font-semibold">{groups.length}</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">Click to expand categories and products</div>
      </summary>

      <div className="border-t border-slate-200 px-5 py-4">
        {groups.length === 0 ? (
          <div className="text-sm text-slate-600">No lines in this batch.</div>
        ) : (
          <div className="space-y-4">
            {groups.map(([category, items]) => (
              <CategoryBlock key={category} category={category} items={items} />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function CategoryBlock({ category, items }: { category: string; items: BatchLineRow[] }) {
  const totals = useMemo(() => {
    let received = 0;
    let remaining = 0;
    let cost = 0;
    let potentialRevenue = 0;

    for (const l of items) {
      received += l.qty_received ?? 0;
      remaining += l.qty_remaining ?? 0;
      cost += (l.qty_received ?? 0) * (l.unit_cost_cents ?? 0);
      potentialRevenue += (l.qty_received ?? 0) * (l.price_cents ?? 0);
    }

    return {
      received,
      remaining,
      cost,
      potentialProfit: potentialRevenue - cost,
    };
  }, [items]);

  return (
    <div className="rounded-2xl border border-slate-200">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold">{category}</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white px-3 py-1 text-slate-700">Received: {totals.received}</span>
          <span className="rounded-full bg-white px-3 py-1 text-slate-700">Remaining: {totals.remaining}</span>
          <span className="rounded-full bg-white px-3 py-1 text-slate-700">Cost: {peso(totals.cost)}</span>
          <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900">
            Est. Profit: {peso(totals.potentialProfit)}
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {items
          .sort((a, b) => (a.product_name ?? "").localeCompare(b.product_name ?? ""))
          .map((l) => {
            const lineCost = (l.qty_received ?? 0) * (l.unit_cost_cents ?? 0);
            const lineRevenue = (l.qty_received ?? 0) * (l.price_cents ?? 0);
            const lineProfit = lineRevenue - lineCost;

            return (
              <div key={l.product_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-slate-900">{l.product_name}</div>
                  <div className="text-xs text-slate-500">
                    Received {l.qty_received} • Remaining {l.qty_remaining} • Unit cost {peso(l.unit_cost_cents)} • Price{" "}
                    {peso(l.price_cents ?? 0)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-700">Cost: {peso(lineCost)}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-700">Revenue: {peso(lineRevenue)}</span>
                  <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">
                    Profit: {peso(lineProfit)}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
