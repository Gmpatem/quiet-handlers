"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price_cents: number | null;
  cost_cents: number | null;
  stock_qty: number | null;
  is_active: boolean;
  photo_url: string | null;
};

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    (cents ?? 0) / 100
  );
}

function toCents(input: string) {
  const clean = String(input ?? "").replace(/[^0-9.]/g, "");
  const n = Number(clean);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

function toInt(input: string) {
  const n = parseInt(String(input ?? "").replace(/[^0-9]/g, ""), 10);
  return isFinite(n) ? n : 0;
}

type LineState = {
  qty: string;
  unitCost: string;
  newPrice: string;
  newDefaultCost: string;
};

export default function ReceiveInventoryClient({ products }: { products: Product[] }) {
  const supabase = supabaseBrowser();

  const activeProducts = useMemo(
    () => (products ?? []).filter((p) => p.is_active),
    [products]
  );

  const categories = useMemo(() => {
    const m = new Map<string, Product[]>();
    for (const p of activeProducts) {
      const key = p.category || "Uncategorized";
      m.set(key, [...(m.get(key) ?? []), p]);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activeProducts]);

  const [supplier, setSupplier] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");

  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [isPending, startTransition] = useTransition();
  const submitLock = useRef(false);

  function getLine(p: Product): LineState {
    const existing = lines[p.id];
    if (existing) return existing;

    const defaultCost = ((p.cost_cents ?? 0) / 100).toFixed(2);
    return { qty: "0", unitCost: defaultCost, newPrice: "", newDefaultCost: "" };
  }

  function setLine(productId: string, patch: Partial<LineState>) {
    setLines((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? { qty: "0", unitCost: "0.00", newPrice: "", newDefaultCost: "" }), ...patch },
    }));
  }

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .map(([cat, ps]) => {
        const keep = ps.filter((p) => (p.name ?? "").toLowerCase().includes(q) || (cat ?? "").toLowerCase().includes(q));
        return [cat, keep] as [string, Product[]];
      })
      .filter(([, ps]) => ps.length > 0);
  }, [categories, query]);

  const totals = useMemo(() => {
    let distinct = 0;
    let units = 0;
    let cost = 0;
    let revenue = 0;

    let missingCost = 0;
    let lossLines = 0;

    for (const p of activeProducts) {
      const st = lines[p.id];
      if (!st) continue;

      const qty = Math.max(0, toInt(st.qty));
      if (qty <= 0) continue;

      distinct += 1;
      units += qty;

      const unitCost = toCents(st.unitCost);
      if (unitCost <= 0) missingCost += 1;

      const newPriceCents = st.newPrice.trim() ? toCents(st.newPrice) : null;
      const price = newPriceCents ?? (p.price_cents ?? 0);

      cost += qty * unitCost;
      revenue += qty * price;

      if (price < unitCost) lossLines += 1;
    }

    return {
      distinct,
      units,
      cost,
      revenue,
      profit: revenue - cost,
      missingCost,
      lossLines,
    };
  }, [lines, activeProducts]);

  function buildBatchNote() {
    const parts = [];
    if (supplier.trim()) parts.push(`Supplier: ${supplier.trim()}`);
    if (receiptRef.trim()) parts.push(`Receipt: ${receiptRef.trim()}`);
    if (note.trim()) parts.push(note.trim());
    return parts.join(" • ") || null;
  }

  function buildReceiveItems() {
    // for receive_inventory_batch_atomic
    return activeProducts
      .map((p) => {
        const st = lines[p.id];
        if (!st) return null;

        const qty = Math.max(0, toInt(st.qty));
        if (qty <= 0) return null;

        const unit_cost_cents = toCents(st.unitCost);
        return { product_id: p.id, qty, unit_cost_cents };
      })
      .filter(Boolean);
  }

  function buildProductUpdates() {
    // for admin_bulk_update_products
    const updates: any[] = [];

    for (const p of activeProducts) {
      const st = lines[p.id];
      if (!st) continue;

      const qty = Math.max(0, toInt(st.qty));
      // allow updates even if qty is 0? usually no, keep it tied to this receiving
      if (qty <= 0) continue;

      const price = st.newPrice.trim() ? toCents(st.newPrice) : null;
      const cost = st.newDefaultCost.trim() ? toCents(st.newDefaultCost) : null;

      if (price === null && cost === null) continue;

      updates.push({
        product_id: p.id,
        ...(price !== null ? { price_cents: price } : {}),
        ...(cost !== null ? { cost_cents: cost } : {}),
      });
    }

    return updates;
  }

  async function onReceive() {
    if (submitLock.current) return;

    const items: any[] = buildReceiveItems() as any[];
    if (items.length === 0) return alert("Add at least one product with Qty > 0.");

    if (totals.missingCost > 0) {
      return alert("Some selected items have missing/zero Unit Cost. Please enter unit cost for all received items.");
    }

    submitLock.current = true;

    startTransition(async () => {
      try {
        // 1) Create the batch atomically (your existing RPC)
        const { data, error } = await supabase.rpc("receive_inventory_batch_atomic", {
          p_items: items,
          p_note: buildBatchNote(),
        });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        const batchCode = row?.batch_code ?? "Batch received";

        // 2) Optional admin updates (price + default cost)
        const updates = buildProductUpdates();
        if (updates.length > 0) {
          const { error: uErr } = await supabase.rpc("admin_bulk_update_products", {
            p_updates: updates,
          });
          if (uErr) throw uErr;
        }

        alert(`✅ Received: ${batchCode}`);

        // reset form
        setSupplier("");
        setReceiptRef("");
        setNote("");
        setLines({});
      } catch (e: any) {
        alert(e?.message ?? "Receive failed");
      } finally {
        submitLock.current = false;
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Inventory Reception</h1>
          <p className="mt-1 text-sm text-stone-600">
            Each restock creates one batch code. Enter Qty + Unit Cost. Optionally update selling price and default cost.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/inventory-management"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            ← Back
          </Link>
          <button
            onClick={onReceive}
            disabled={isPending}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
          >
            {isPending ? "Receiving..." : "Receive Batch"}
          </button>
        </div>
      </div>

      {/* Batch header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Supplier</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="e.g., Kiko Store"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Receipt / Ref</label>
            <input
              value={receiptRef}
              onChange={(e) => setReceiptRef(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="e.g., OR-1032"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="Find product..."
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
            placeholder="Optional notes..."
          />
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Selected products" value={String(totals.distinct)} />
        <Stat label="Total units" value={String(totals.units)} />
        <Stat label="Batch cost" value={peso(totals.cost)} />
        <Stat label="Est. profit" value={peso(totals.profit)} />
      </div>

      {(totals.lossLines > 0 || totals.missingCost > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {totals.missingCost > 0 && (
            <div>⚠️ Some selected items have missing/zero unit cost. Please fill unit cost for all received items.</div>
          )}
          {totals.lossLines > 0 && (
            <div className="mt-1">⚠️ Some selected items have price lower than cost (potential loss). You can still receive, but double check.</div>
          )}
        </div>
      )}

      {/* Category entry */}
      <div className="space-y-4">
        {filteredCategories.map(([category, ps]) => {
          // category-level preview totals
          let catUnits = 0;
          let catCost = 0;
          let catRevenue = 0;

          for (const p of ps) {
            const st = lines[p.id];
            if (!st) continue;
            const qty = Math.max(0, toInt(st.qty));
            if (qty <= 0) continue;

            const unitCost = toCents(st.unitCost);
            const newPriceCents = st.newPrice.trim() ? toCents(st.newPrice) : null;
            const price = newPriceCents ?? (p.price_cents ?? 0);

            catUnits += qty;
            catCost += qty * unitCost;
            catRevenue += qty * price;
          }

          return (
            <details key={category} className="rounded-2xl border border-stone-200 bg-white">
              <summary className="cursor-pointer list-none px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Category</div>
                    <div className="text-lg font-semibold text-stone-900">{category}</div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">Units: {catUnits}</span>
                    <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">Cost: {peso(catCost)}</span>
                    <span className="rounded-full bg-stone-900 px-3 py-1 font-semibold text-white">
                      Profit: {peso(catRevenue - catCost)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-stone-500">Click to enter quantities</div>
              </summary>

              <div className="border-t border-stone-200 px-5 py-4">
                <div className="grid gap-3">
                  {ps.map((p) => {
                    const st = getLine(p);
                    const qty = Math.max(0, toInt(st.qty));
                    const unitCost = toCents(st.unitCost);
                    const newPriceCents = st.newPrice.trim() ? toCents(st.newPrice) : null;
                    const price = newPriceCents ?? (p.price_cents ?? 0);

                    const lineCost = qty * unitCost;
                    const lineProfit = qty * price - lineCost;

                    return (
                      <div key={p.id} className="rounded-2xl border border-stone-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-xl border border-stone-200 bg-white">
                                {p.photo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-[10px] text-stone-400">No img</div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate font-semibold text-stone-900">{p.name}</div>
                                <div className="text-xs text-stone-500">
                                  Stock: {p.stock_qty ?? 0} • Current price: {peso(p.price_cents ?? 0)} • Default cost:{" "}
                                  {peso(p.cost_cents ?? 0)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <Field label="Qty received">
                              <input
                                value={lines[p.id]?.qty ?? st.qty}
                                onChange={(e) => setLine(p.id, { qty: e.target.value })}
                                className="w-28 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
                                inputMode="numeric"
                              />
                            </Field>

                            <Field label="Unit cost (PHP)">
                              <input
                                value={lines[p.id]?.unitCost ?? st.unitCost}
                                onChange={(e) => setLine(p.id, { unitCost: e.target.value })}
                                className="w-40 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
                                inputMode="decimal"
                              />
                            </Field>

                            <Field label="New price (optional)">
                              <input
                                value={lines[p.id]?.newPrice ?? st.newPrice}
                                onChange={(e) => setLine(p.id, { newPrice: e.target.value })}
                                className="w-44 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
                                inputMode="decimal"
                                placeholder="leave blank"
                              />
                            </Field>

                            <Field label="New default cost (optional)">
                              <input
                                value={lines[p.id]?.newDefaultCost ?? st.newDefaultCost}
                                onChange={(e) => setLine(p.id, { newDefaultCost: e.target.value })}
                                className="w-48 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-2"
                                inputMode="decimal"
                                placeholder="leave blank"
                              />
                            </Field>
                          </div>
                        </div>

                        {qty > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-stone-50 px-3 py-1 text-stone-700">Line cost: {peso(lineCost)}</span>
                            <span className="rounded-full bg-stone-900 px-3 py-1 font-semibold text-white">Line profit: {peso(lineProfit)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="rounded-2xl border border-stone-200 p-6 text-stone-600">
            No products match your search.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-stone-900">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
