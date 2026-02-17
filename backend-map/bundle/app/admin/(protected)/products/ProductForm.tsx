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
      setFile(null);
    } else {
      setName("");
      setCategory("");
      setPrice("0.00");
      setCost("0.00");
      setStock("0");
      setActive(true);
      setPhotoUrl(null);
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-xs text-slate-500">Prices are stored as cents for accuracy.</div>
          </div>
          <button onClick={close} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
            Close
          </button>
        </div>

        <div className="p-5 grid gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2" />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Price (PHP)</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2" inputMode="decimal" />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Cost (PHP)</label>
              <input value={cost} onChange={(e) => setCost(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2" inputMode="decimal" />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Stock</label>
              <input value={stock} onChange={(e) => setStock(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2" inputMode="numeric" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Image</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
            {photoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200">
                  <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="text-xs text-slate-600 break-all">{photoUrl}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button onClick={close} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={save} disabled={isPending} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
