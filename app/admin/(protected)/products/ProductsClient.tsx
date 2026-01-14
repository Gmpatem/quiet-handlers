"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProductForm, { ProductRow } from "./ProductForm";
import { supabaseBrowser } from "@/lib/supabase/browser";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })
    .format((cents ?? 0) / 100);
}

export default function ProductsClient({ initialProducts }: { initialProducts: ProductRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (initialProducts ?? [])
      .filter(p => (showInactive ? true : p.is_active))
      .filter(p => {
        if (!q) return true;
        return (
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q)
        );
      });
  }, [initialProducts, query, showInactive]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    for (const p of filtered) {
      const key = p.category || "Uncategorized";
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function onNew() {
    setEditing(null);
    setOpen(true);
  }

  function onEdit(p: ProductRow) {
    setEditing(p);
    setOpen(true);
  }

  async function onDelete(p: ProductRow) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) return alert(`Delete failed: ${error.message}`);
      router.refresh();
    });
  }

  async function onToggleActive(p: ProductRow) {
    startTransition(async () => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) return alert(`Update failed: ${error.message}`);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, edit, activate/deactivate, manage stock, and upload product images.
          </p>
        </div>

        <button
          onClick={onNew}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New Product
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or category..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {isPending && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          Working...
        </div>
      )}

      <div className="mt-6 space-y-6">
        {grouped.map(([category, items]) => (
          <div key={category} className="rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="font-semibold">{category}</div>
              <div className="text-sm text-slate-600">{items.length} item(s)</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr className="border-b">
                    <th className="py-2 px-4">Product</th>
                    <th className="py-2 px-4">Price</th>
                    <th className="py-2 px-4">Cost</th>
                    <th className="py-2 px-4">Stock</th>
                    <th className="py-2 px-4">Active</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {p.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs text-slate-400">No img</div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.category ?? "Uncategorized"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{peso(p.price_cents)}</td>
                      <td className="py-3 px-4">{peso(p.cost_cents)}</td>
                      <td className="py-3 px-4">{p.stock_qty}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onToggleActive(p)}
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {p.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onEdit(p)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(p)}
                            className="rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!items.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-slate-600">
                        No products.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {!grouped.length && (
          <div className="rounded-2xl border border-slate-200 p-6 text-slate-600">
            No products found.
          </div>
        )}
      </div>

      <ProductForm
        open={open}
        setOpen={setOpen}
        editing={editing}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}
