"use client";

import { useMemo, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { ProductRow } from "./ProductForm";

function toCents(v: string) {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

type ReceiveBatchRpcRow = {
  batch_id: string;
  batch_code: string;
};

export default function ReceiveBatchForm({
  open,
  setOpen,
  products,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  products: ProductRow[];
  onSaved: (batchCode: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Record<string, { qty: string; unitCost: string }>>({});

  const activeProducts = useMemo(() => products.filter((p) => p.is_active), [products]);

  if (!open) return null;

  function close() {
    setOpen(false);
  }

  function setLine(id: string, patch: Partial<{ qty: string; unitCost: string }>) {
    setLines((prev) => ({
      ...prev,
      [id]: { qty: prev[id]?.qty ?? "0", unitCost: prev[id]?.unitCost ?? "0.00", ...patch },
    }));
  }

  function buildPayload() {
    return Object.entries(lines)
      .map(([product_id, v]) => ({
        product_id,
        qty: Math.max(0, parseInt(v.qty || "0", 10) || 0),
        unit_cost_cents: toCents(v.unitCost || "0"),
      }))
      .filter((x) => x.qty > 0);
  }

  async function save() {
    const items = buildPayload();
    if (items.length === 0) return alert("Add at least one product with qty > 0.");

    startTransition(async () => {
      try {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase.rpc("receive_inventory_batch_atomic", {
          p_items: items,
          p_note: note.trim() || null,
        });

        if (error) throw error;

        const row = (Array.isArray(data) ? data[0] : data) as ReceiveBatchRpcRow | null;
        const batchCode = row?.batch_code ?? null;

        onSaved(batchCode);

        setOpen(false);
        setNote("");
        setLines({});
      } catch (e: any) {
        alert(e?.message ?? "Batch receive failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-lg font-semibold">Receive Stock Batch</div>
            <div className="text-xs text-slate-500">
              Creates a batch + lots, updates product stock, and unlocks batch profit reporting.
            </div>
          </div>
          <button
            onClick={close}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Batch note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="e.g., Supplier: Kiko Store, Receipt #123"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr className="border-b">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2 w-28">Qty</th>
                  <th className="px-4 py-2 w-44">Unit Cost (PHP)</th>
                </tr>
              </thead>
              <tbody>
                {activeProducts.map((p) => {
                  const v =
                    lines[p.id] ?? { qty: "0", unitCost: ((p.cost_cents ?? 0) / 100).toFixed(2) };

                  return (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.category ?? "Uncategorized"}</div>
                      </td>

                      <td className="px-4 py-2">
                        <input
                          value={v.qty}
                          onChange={(e) => setLine(p.id, { qty: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 outline-none focus:ring-2"
                          inputMode="numeric"
                        />
                      </td>

                      <td className="px-4 py-2">
                        <input
                          value={v.unitCost}
                          onChange={(e) => setLine(p.id, { unitCost: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 outline-none focus:ring-2"
                          inputMode="decimal"
                        />
                      </td>
                    </tr>
                  );
                })}

                {!activeProducts.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-slate-600">
                      No active products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            onClick={close}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={isPending}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Receive Batch"}
          </button>
        </div>
      </div>
    </div>
  );
}
