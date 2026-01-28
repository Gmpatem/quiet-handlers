"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price_cents: number;
  stock_qty: number;
  is_active: boolean;
  photo_url: string | null;
};

type CartItem = {
  id: string;
  name: string;
  category: string | null;
  price_cents: number;
  qty: number;
  photo_url: string | null;
};

const CART_KEY = "tenpesorun_cart_v1";
const ALL = "All";
const DEFAULT_CAT = "All";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

function normalizeCategory(c?: string | null) {
  const v = (c || "Other").trim();
  return v || "Other";
}

export default function Storefront({
  settings,
  products: initialProducts,
  productsError,
}: {
  settings: Record<string, any>;
  products: Product[];
  productsError: string | null;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  // -------------------------
  // Cart (UNCHANGED logic)
  // -------------------------
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const cartCount = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);
  const subtotalCents = useMemo(() => cart.reduce((a, i) => a + i.qty * i.price_cents, 0), [cart]);

  function add(p: Product) {
    if ((p.stock_qty ?? 0) <= 0) return;
    setCart((prev) => {
      const ex = prev.find((x) => x.id === p.id);
      if (ex) return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [
        ...prev,
        { id: p.id, name: p.name, category: p.category, price_cents: p.price_cents, qty: 1, photo_url: p.photo_url },
      ];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((x) => x.id !== id);
      return prev.map((x) => (x.id === id ? { ...x, qty } : x));
    });
  }

  function checkout() {
    window.location.href = "/checkout";
  }

  // -------------------------
  // Option A: Category-driven loading + cache
  // -------------------------
  const settingOrder: string[] = Array.isArray(settings?.category_order) ? settings.category_order : [];
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState<string>(() => {
    // ✅ default should be ALL
    return ALL;
  });

  // Cache products per category (✅ TS-safe)
  const [cache, setCache] = useState<Record<string, Product[]>>(() => {
    const all = (initialProducts ?? []) as Product[];
    return all.length ? { [ALL]: all } : ({} as Record<string, Product[]>);
  });

  const [products, setProducts] = useState<Product[]>(() => {
    return (initialProducts ?? []) as Product[];
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [loadErr, setLoadErr] = useState<string | null>(productsError ?? null);

  // Build category list (✅ only categories that have items)
  useEffect(() => {
    const all = cache[ALL] ?? [];
    const counts = new Map<string, number>();

    for (const p of all) {
      const cat = normalizeCategory(p.category);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }

    let arr = Array.from(counts.entries())
      .filter(([, n]) => n > 0)
      .map(([c]) => c);

    // Optional: respect settings order, but only for categories that exist
    if (settingOrder?.length) {
      const ordered: string[] = [];
      const seen = new Set<string>();

      for (const s of settingOrder) {
        const ns = normalizeCategory(s);
        if (arr.includes(ns) && !seen.has(ns)) {
          ordered.push(ns);
          seen.add(ns);
        }
      }

      for (const c of arr) {
        if (!seen.has(c)) ordered.push(c);
      }

      arr = ordered;
    } else {
      arr.sort((a, b) => a.localeCompare(b));
    }

    setCategories([ALL, ...arr]);

    // ✅ If active category no longer exists, fall back to ALL
    if (activeCat !== ALL && !arr.includes(activeCat)) {
      setActiveCat(ALL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingOrder?.join("|"), cache[ALL]?.length]);

  async function loadProductsFor(cat: string) {
    setLoadErr(null);

    // cache hit
    if (cache[cat]) {
      setProducts(cache[cat]);
      return;
    }

    setLoading(true);

    try {
      let q = supabase
        .from("products")
        .select("id, name, category, price_cents, stock_qty, is_active, photo_url")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (cat !== ALL) {
        if (cat === "Other") {
          q = q.or("category.is.null,category.eq.Other");
        } else {
          q = q.eq("category", cat);
        }
      }

      const { data, error } = await q;

      if (error) {
        setLoadErr(error.message);
        setProducts([]);
      } else {
        const list = (data ?? []) as Product[];
        setProducts(list);
        setCache((prev) => ({ ...prev, [cat]: list }));
      }
    } catch (e: any) {
      setLoadErr(e?.message ?? "Failed to load products");
      setProducts([]);
    }

    setLoading(false);
  }

  // fetch on category change
  useEffect(() => {
    if (!activeCat) return;
    loadProductsFor(activeCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat]);

  // ✅ NEW: sorted view (in-stock first, out-of-stock last, keep name ordering otherwise)
  const sortedProducts = useMemo(() => {
    const list = (products ?? []).slice();
    list.sort((a, b) => {
      const aOut = (a.stock_qty ?? 0) <= 0;
      const bOut = (b.stock_qty ?? 0) <= 0;

      if (aOut !== bOut) return aOut ? 1 : -1;

      // Both in same stock bucket: keep alphabetical by name (matches your query order)
      const an = (a.name ?? "").toLowerCase();
      const bn = (b.name ?? "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return list;
  }, [products]);

  // ✅ Rebrand defaults (still respects settings if you set them in DB)
  const heroTitle = (settings?.landing_hero_title ?? "FDS") as string;
  const heroSubtitle = (settings?.landing_hero_subtitle ?? "Final Destination Services") as string;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-900 text-xs font-semibold text-white shadow-sm">
              FDS
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">{heroTitle}</div>
              <div className="text-xs text-slate-500">Handling things. Quietly.</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://forms.gle/KBhZ8Et4fqdG7g5y5"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm transition"
            >
              Printing Services
            </a>

            <a
              href="/admin"
              className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm transition"
            >
              Admin
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-36 sm:pb-10">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur sm:p-9">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-white" />
          <div className="relative">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{heroSubtitle}</h1>
            <p className="mt-2 text-sm text-slate-600">Pick a category, tap to add. Checkout when ready.</p>

            {/* Category chips */}
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => {
                const active = c === activeCat;
                return (
                  <button
                    key={c}
                    onClick={() => setActiveCat(c)}
                    className={[
                      "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Showing: <span className="font-semibold text-slate-700">{activeCat}</span>
            </div>
          </div>
        </div>

        {loadErr && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load products: {loadErr}
          </div>
        )}

        {/* Layout */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Catalog */}
          <div>
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                {activeCat === ALL ? "All products" : activeCat}
              </h2>
              <div className="text-xs text-slate-500">{loading ? "Loading…" : `${sortedProducts.length} item(s)`}</div>
            </div>
            <div className="mt-3 h-px w-full bg-slate-100" />

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {sortedProducts.map((p) => {
                const stock = p.stock_qty ?? 0;
                const out = stock <= 0;
                const low = !out && stock > 0 && stock <= 5;

                return (
                  <div
                    key={p.id}
                    className={[
                      "group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-slate-300",
                      out ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs text-slate-400">No image</div>
                      )}

                      {out && (
                        <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-semibold text-slate-700">
                          Out of stock
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</div>

                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-sm font-semibold">{peso(p.price_cents)}</div>

                        <div
                          className={[
                            "rounded-full px-2 py-0.5 text-[11px] font-medium border",
                            out
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : low
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-50 text-slate-600 border-slate-200",
                          ].join(" ")}
                        >
                          {out ? "Out" : low ? `Only ${stock} left` : `Stock: ${stock}`}
                        </div>
                      </div>

                      {low && (
                        <div className="mt-1 text-[11px] font-medium text-amber-700">Limited stock, grab it now.</div>
                      )}
                    </div>

                    <button
                      disabled={out}
                      onClick={() => add(p)}
                      className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                );
              })}

              {!loading && sortedProducts.length === 0 && (
                <div className="col-span-2 sm:col-span-3 lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  No items in this category.
                </div>
              )}
            </div>
          </div>

          {/* Sticky cart (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">Cart</div>
                  <div className="text-xs text-slate-500">{cartCount ? `${cartCount} item(s)` : ""}</div>
                </div>

                <div className="mt-4 max-h-[55vh] overflow-auto space-y-3">
                  {!cart.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Add items to see them here.
                    </div>
                  ) : (
                    cart.map((i) => (
                      <div key={i.id} className="flex gap-3 rounded-2xl border border-slate-200 p-3">
                        <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {i.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={i.photo_url} alt={i.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-slate-400">—</div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="text-sm font-semibold">{i.name}</div>
                          <div className="text-xs text-slate-500">{peso(i.price_cents)}</div>

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => setQty(i.id, i.qty - 1)}
                              className="h-8 w-8 rounded-xl border border-slate-200 hover:bg-slate-50"
                            >
                              -
                            </button>
                            <div className="min-w-[28px] text-center text-sm font-semibold">{i.qty}</div>
                            <button
                              onClick={() => setQty(i.id, i.qty + 1)}
                              className="h-8 w-8 rounded-xl border border-slate-200 hover:bg-slate-50"
                            >
                              +
                            </button>
                            <div className="ml-auto text-sm font-semibold tabular-nums">{peso(i.qty * i.price_cents)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50/60 p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold tabular-nums">{peso(subtotalCents)}</span>
                </div>

                <button
                  disabled={!cart.length}
                  onClick={checkout}
                  className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Checkout
                </button>

                <div className="mt-2 text-center text-xs text-slate-500">Checkout uses your cart automatically.</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile cart bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Cart</div>
              <div className="text-xs text-slate-500">{cartCount ? `${cartCount} item(s)` : ""}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Subtotal</div>
              <div className="text-sm font-semibold tabular-nums">{peso(subtotalCents)}</div>
            </div>
          </div>

          <button
            disabled={!cart.length}
            onClick={checkout}
            className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
