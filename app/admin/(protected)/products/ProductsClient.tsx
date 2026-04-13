"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
      {/* Header - Pack G: Consistent styling with stone theme */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Products</h1>
          <p className="mt-1 text-sm text-stone-600">
            Manage catalog, pricing, stock levels, and product badges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/inventory-management"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:bg-amber-50"
          >
            📊 Inventory →
          </Link>
          <button
            onClick={onNew}
            className="rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-amber-800 hover:to-amber-950"
          >
            + New Product
          </button>
        </div>
      </div>

      {/* Search & Filters - Pack G: Improved styling */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products by name or category..."
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
          />
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 cursor-pointer transition hover:border-amber-700 hover:bg-amber-50">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-stone-300 text-amber-700 focus:ring-amber-700"
          />
          Show inactive products
        </label>
      </div>

      {/* Loading State - Pack G: Better feedback */}
      {isPending && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
          Updating products...
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* Product Groups - Pack G: Consistent stone theme */}
        {grouped.map(([category, items]) => (
          <div key={category} className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white px-4 py-3">
              <div className="font-semibold text-stone-900">{category}</div>
              <div className="text-sm text-stone-500">{items.length} product{items.length !== 1 ? 's' : ''}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-stone-500">
                  <tr className="border-b border-stone-200">
                    <th className="py-3 px-4 font-medium">Product</th>
                    <th className="py-3 px-4 font-medium">Price</th>
                    <th className="py-3 px-4 font-medium">Cost</th>
                    <th className="py-3 px-4 font-medium">Stock</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                            {p.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs text-stone-400">No img</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-stone-900">{p.name}</div>
                              {p.badge_text && (
                                <span className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                                  {p.badge_text}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-500">{p.category ?? "Uncategorized"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-900">{peso(p.price_cents)}</td>
                      <td className="py-3 px-4 text-stone-600">{peso(p.cost_cents)}</td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${p.stock_qty === 0 ? 'text-red-600' : p.stock_qty <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {p.stock_qty}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onToggleActive(p)}
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold transition",
                            p.is_active 
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                              : "bg-stone-100 text-stone-500 hover:bg-stone-200",
                          ].join(" ")}
                        >
                          {p.is_active ? "● Active" : "○ Inactive"}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onEdit(p)}
                            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:bg-amber-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(p)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Empty State - Pack G */}
                  {!items.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <div className="text-stone-400 text-4xl mb-2">📦</div>
                        <p className="text-stone-600 font-medium">No products in this category</p>
                        <p className="text-sm text-stone-500 mt-1">
                          {query ? 'Try adjusting your search' : 'Add a new product to get started'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Global Empty State - Pack G */}
        {!grouped.length && (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <div className="text-stone-400 text-5xl mb-3">🛍️</div>
            <h3 className="text-lg font-semibold text-stone-900">No products found</h3>
            <p className="text-stone-600 mt-2 max-w-md mx-auto">
              {query 
                ? 'No products match your search. Try different keywords or clear the filter.' 
                : 'Your catalog is empty. Add your first product to start selling.'}
            </p>
            {!query && (
              <button
                onClick={onNew}
                className="mt-4 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-amber-800 hover:to-amber-950"
              >
                + Add First Product
              </button>
            )}
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


