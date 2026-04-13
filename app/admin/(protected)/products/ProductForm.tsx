"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  price_cents: number;
  cost_cents: number;
  stock_qty: number;
  is_active: boolean;
  photo_url: string | null;
  badge_text: string | null;
};

function toCents(v: string) {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

function fromCents(cents: number) {
  return ((cents ?? 0) / 100).toFixed(2);
}

async function uploadProductImage(file: File, productId: string) {
  const supabase = supabaseBrowser();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const path = `${productId}/${Date.now()}.${safeExt}`;

  const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

export default function ProductForm({
  open,
  setOpen,
  editing,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  editing: ProductRow | null;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!editing;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0.00");
  const [cost, setCost] = useState("0.00");
  const [stock, setStock] = useState("0");
  const [active, setActive] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [badgeText, setBadgeText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const title = useMemo(() => (isEdit ? "Edit product" : "New product"), [isEdit]);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setName(editing.name ?? "");
      setCategory(editing.category ?? "");
      setPrice(fromCents(editing.price_cents ?? 0));
      setCost(fromCents(editing.cost_cents ?? 0));
      setStock(String(editing.stock_qty ?? 0));
      setActive(!!editing.is_active);
      setPhotoUrl(editing.photo_url ?? null);
      setBadgeText(editing.badge_text ?? "");
      setFile(null);
    } else {
      setName("");
      setCategory("");
      setPrice("0.00");
      setCost("0.00");
      setStock("0");
      setActive(true);
      setPhotoUrl(null);
      setBadgeText("");
      setFile(null);
    }
  }, [open, editing]);

  if (!open) return null;

  function close() {
    setOpen(false);
  }

  async function save() {
    const payload = {
      name: name.trim(),
      category: category.trim() || null,
      price_cents: toCents(price),
      cost_cents: toCents(cost),
      stock_qty: Math.max(0, parseInt(stock || "0", 10) || 0),
      is_active: !!active,
      badge_text: badgeText.trim() || null,
    };

    if (!payload.name) return alert("Name is required.");

    startTransition(async () => {
      try {
        const supabase = supabaseBrowser();

        let productId = editing?.id;

        if (!productId) {
          const { data, error } = await supabase.from("products").insert(payload).select("id").single();
          if (error) throw error;
          productId = data.id;
        } else {
          const { error } = await supabase.from("products").update(payload).eq("id", productId);
          if (error) throw error;
        }

        if (file && productId) {
          const url = await uploadProductImage(file, productId);
          const { error: upErr } = await supabase.from("products").update({ photo_url: url }).eq("id", productId);
          if (upErr) throw upErr;
        }

        onSaved();
      } catch (err: any) {
        alert(err?.message ?? "Save failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white shadow-2xl">
        {/* Header - Pack G: Consistent stone theme */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white px-5 py-4">
          <div>
            <div className="text-lg font-semibold text-stone-900">{title}</div>
            <div className="text-xs text-stone-500">Prices are stored as cents for accuracy</div>
          </div>
          <button onClick={close} className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:bg-amber-50">
            Close
          </button>
        </div>

        <div className="p-5 grid gap-4">
          {/* Name */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-stone-700">Product Name *</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20" 
              placeholder="Enter product name"
            />
          </div>

          {/* Category */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-stone-700">Category</label>
            <input 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20" 
              placeholder="e.g., Snacks, Drinks, School Supplies"
            />
          </div>

          {/* Price, Cost, Stock */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-stone-700">Price (₱)</label>
              <input 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20" 
                inputMode="decimal" 
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-stone-700">Cost (₱)</label>
              <input 
                value={cost} 
                onChange={(e) => setCost(e.target.value)} 
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20" 
                inputMode="decimal" 
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-stone-700">Stock Qty</label>
              <input 
                value={stock} 
                onChange={(e) => setStock(e.target.value)} 
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20" 
                inputMode="numeric" 
                placeholder="0"
              />
            </div>
          </div>

          {/* Badge */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-stone-700">Badge Text</label>
            <input 
              value={badgeText} 
              onChange={(e) => setBadgeText(e.target.value)} 
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20" 
              placeholder="e.g., NEW, HOT, SALE, LIMITED"
            />
            <p className="text-xs text-stone-500">Optional badge displayed on the product card in storefront</p>
          </div>

          {/* Active Toggle */}
          <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 cursor-pointer transition hover:border-amber-700 hover:bg-amber-50">
            <input 
              type="checkbox" 
              checked={active} 
              onChange={(e) => setActive(e.target.checked)} 
              className="rounded border-stone-300 text-amber-700 focus:ring-amber-700"
            />
            <span>Product is active and visible in storefront</span>
          </label>

          {/* Image Upload */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-stone-700">Product Image</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} 
              className="text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-amber-700 hover:file:bg-amber-200" 
            />
            {photoUrl && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-stone-200">
                  <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-stone-700">Current image</div>
                  <div className="text-xs text-stone-500 truncate">{photoUrl}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
          <button onClick={close} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:bg-amber-50">
            Cancel
          </button>
          <button onClick={save} disabled={isPending} className="rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-amber-800 hover:to-amber-950 disabled:opacity-60">
            {isPending ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
