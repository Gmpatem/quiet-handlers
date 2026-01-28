"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cartSubtotalCents, loadCart, saveCart, upsertCartItem } from "@/lib/cart";
import { formatPHP } from "@/lib/money";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { CartItem, Product } from "@/lib/types";

type AppSettingRow = { key: string; value: any };

const DEFAULT_CATEGORY_ORDER = [
  "Drinks",
  "Noodles",
  "Snacks",
  "Filling Snacks",
  "Instant Meals",
  "Stress & Sweet Snacks",
  "Dorm Essential Boosters",
  "Other",
];

const DEFAULT_FEATURED = ["Noodles", "Drinks", "Snacks"];

const DEFAULT_ICONS: Record<string, string> = {
  Drinks: "🥤",
  Noodles: "🍜",
  Snacks: "🍪",
  "Filling Snacks": "🥪",
  "Instant Meals": "🍛",
  "Stress & Sweet Snacks": "🍫",
  "Dorm Essential Boosters": "☕",
  "Ice Cream": "🍦",
  Combos: "🎁",
  Other: "🧺",
};

function normalizeCategory(c?: string | null) {
  const v = (c || "Other").trim();
  return v || "Other";
}

function sortCategories(categories: string[], order: string[]) {
  const rank = new Map(order.map((c, i) => [c, i]));
  return [...categories].sort((a, b) => {
    const ra = rank.has(a) ? (rank.get(a) as number) : 9999;
    const rb = rank.has(b) ? (rank.get(b) as number) : 9999;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

export default function Catalog() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryOrder, setCategoryOrder] = useState<string[]>(DEFAULT_CATEGORY_ORDER);
  const [featuredCategories, setFeaturedCategories] = useState<string[]>(DEFAULT_FEATURED);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, string>>(DEFAULT_ICONS);

  const ALL = "All";
  const DEFAULT_CAT = "Noodles";
  const [activeCat, setActiveCat] = useState<string>(DEFAULT_CAT);

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: settingsRows, error: sErr } = await supabase.from("app_settings").select("key,value");
        if (!sErr && settingsRows) {
          const map: Record<string, any> = {};
          for (const r of settingsRows as AppSettingRow[]) map[r.key] = r.value;

          if (Array.isArray(map.category_order)) setCategoryOrder(map.category_order);
          if (Array.isArray(map.featured_categories)) setFeaturedCategories(map.featured_categories);
          if (map.category_icons && typeof map.category_icons === "object") setCategoryIcons(map.category_icons);
        }
      } catch {}

      const { data, error } = await supabase
        .from("products")
        .select("id,name,category,price_cents,stock_qty,is_active,photo_url")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setProducts([]);
      } else {
        setProducts((data ?? []) as Product[]);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const subtotal = cartSubtotalCents(cart);
  const cartCount = cart.reduce((s, it) => s + it.qty, 0);

  function bump(p: Product, delta: number) {
    const out = !p.is_active || (p.stock_qty ?? 0) <= 0;
    if (delta > 0 && out) return;
    setCart((prev) => upsertCartItem(prev, p, delta));
  }

  const { cats, grouped } = useMemo(() => {
    const m = new Map<string, Product[]>();

    for (const p of products ?? []) {
      const cat = normalizeCategory(p.category);
      const arr = m.get(cat) ?? [];
      arr.push(p);
      m.set(cat, arr);
    }

    for (const [cat, arr] of m.entries()) {
      arr.sort((a, b) => {
        const ao = !a.is_active || (a.stock_qty ?? 0) <= 0 ? 1 : 0;
        const bo = !b.is_active || (b.stock_qty ?? 0) <= 0 ? 1 : 0;
        if (ao !== bo) return ao - bo;
        return (a.name ?? "").localeCompare(b.name ?? "");
      });
      m.set(cat, arr);
    }

    const ordered = sortCategories(Array.from(m.keys()), categoryOrder);
    return { cats: ordered, grouped: m };
  }, [products, categoryOrder]);

  useEffect(() => {
    if (!cats.length) return;

    if (activeCat !== ALL && !cats.includes(activeCat)) {
      if (cats.includes(DEFAULT_CAT)) setActiveCat(DEFAULT_CAT);
      else setActiveCat(cats[0]);
    }
  }, [cats, activeCat]);

  useEffect(() => {
    if (!cats.length) return;
    if (cats.includes(DEFAULT_CAT)) setActiveCat(DEFAULT_CAT);
  }, [cats.length]);

  const categoryCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cats) m.set(c, (grouped.get(c) ?? []).length);
    return m;
  }, [cats, grouped]);

  const visibleCats = useMemo(() => {
    if (activeCat === ALL) return cats;
    return cats.includes(activeCat) ? [activeCat] : cats;
  }, [cats, activeCat]);

  return (
    <div className="container-app">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          {/* Header */}
          <div className="mb-4 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">F.D.S "Final Destination Services" </h1>
                <p className="mt-1 text-sm text-slate-600">Grab snacks fast. Checkout fast </p>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/checkout"
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-slate-200 bg-white hover:bg-slate-50",
                    cart.length === 0 ? "pointer-events-none opacity-50" : "",
                  ].join(" ")}
                >
                  Checkout
                </Link>
                <Link
                  href="/admin"
                  className="rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Admin
                </Link>
              </div>
            </div>
          </div>

          {/* Category filter bar */}
          {!loading && !error && cats.length > 0 && (
            <div className="sticky top-0 z-10 -mx-1 mb-4 border-b border-slate-200 bg-white/75 px-1 py-2 backdrop-blur">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveCat(ALL)}
                  className={[
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                    activeCat === ALL
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
                  ].join(" ")}
                  aria-pressed={activeCat === ALL}
                  title="All"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="text-base">✨</span>
                    <span className="hidden sm:inline">All</span>
                    <span className={activeCat === ALL ? "text-xs text-white/80" : "text-xs text-slate-500"}>
                      {products.length}
                    </span>
                  </span>
                </button>

                {cats.map((c) => {
                  const active = activeCat === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setActiveCat(c)}
                      className={[
                        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
                      ].join(" ")}
                      aria-pressed={active}
                      title={c}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{categoryIcons[c] ?? "🧺"}</span>
                        <span className="hidden sm:inline">{c}</span>
                        <span className={active ? "text-xs text-white/80" : "text-xs text-slate-500"}>
                          {categoryCount.get(c) ?? 0}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeCat !== ALL && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing <span className="font-semibold text-slate-700">{activeCat}</span> only
                  </span>
                  <button
                    onClick={() => setActiveCat(ALL)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Featured categories */}
          {activeCat === ALL && !loading && !error && cats.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-900">Quick picks</div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {featuredCategories
                  .filter((c) => cats.includes(c))
                  .map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveCat(c)}
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300"
                    >
                      <span className="mr-1">{categoryIcons[c] ?? "🧺"}</span>
                      {c}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {loading && <p className="text-sm text-slate-600">Loading products…</p>}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {!loading && !error && cats.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-600">No products yet. Add some from Admin.</p>
            </div>
          )}

          <div className="space-y-10">
            {visibleCats.map((cat) => {
              const items = grouped.get(cat) ?? [];
              const sectionId = `cat-${cat.replace(/\s+/g, "-")}`;

              return (
                <section key={cat} id={sectionId} className="scroll-mt-24">
                  <div className="flex items-end justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                      <span className="text-base">{categoryIcons[cat] ?? "🧺"}</span>
                      {cat}
                    </h2>
                    <div className="text-xs text-slate-500">{items.length} item(s)</div>
                  </div>
                  <div className="mt-3 h-px w-full bg-slate-100" />

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {items.map((p) => {
                      const inCart = cart.find((x) => x.product.id === p.id)?.qty ?? 0;
                      const out = !p.is_active || (p.stock_qty ?? 0) <= 0;

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
                              <Image src={p.photo_url} alt={p.name} fill className="object-cover transition duration-300 group-hover:scale-[1.02]" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                no image
                              </div>
                            )}
                            {out && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-slate-700">
                                Out of stock
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <div className="line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</div>
                            <div className="mt-1 flex items-center justify-between">
                              <div className="text-sm font-semibold text-slate-900">{formatPHP(p.price_cents)}</div>
                              <span
                                className={[
                                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                  out ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600",
                                ].join(" ")}
                              >
                                {out ? "Out" : `Stock: ${p.stock_qty ?? 0}`}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <button
                                className="h-9 w-9 rounded-xl border border-slate-200 text-lg shadow-sm hover:bg-slate-50 disabled:opacity-40"
                                onClick={() => bump(p, -1)}
                                disabled={inCart <= 0}
                                aria-label="remove"
                              >
                                –
                              </button>
                              <div className="text-sm font-semibold tabular-nums">{inCart}</div>
                              <button
                                className="h-9 w-9 rounded-xl border border-slate-200 text-lg shadow-sm hover:bg-slate-50 disabled:opacity-40"
                                onClick={() => bump(p, 1)}
                                disabled={out}
                                aria-label="add"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Cart summary */}
        <aside className="lg:w-[340px]">
          <div className="sticky top-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Cart</div>
                <div className="text-xs text-slate-500">{cartCount} item(s)</div>
              </div>

              <div className="mt-4 space-y-2">
                {cart.length === 0 && <p className="text-sm text-slate-600">Empty for now.</p>}
                {cart.slice(0, 6).map((it) => (
                  <div key={it.product.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex-1">
                      <div className="line-clamp-1 font-medium">{it.product.name}</div>
                      <div className="text-xs text-slate-500">
                        {it.qty} × {formatPHP(it.product.price_cents)}
                      </div>
                    </div>
                    <div className="tabular-nums font-semibold">{formatPHP(it.product.price_cents * it.qty)}</div>
                  </div>
                ))}
                {cart.length > 6 && <div className="text-xs text-slate-500">+ {cart.length - 6} more…</div>}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/60 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold tabular-nums">{formatPHP(subtotal)}</span>
              </div>

              <Link
                href="/checkout"
                className={[
                  "mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm",
                  cart.length === 0 ? "pointer-events-none opacity-40" : "hover:bg-slate-800",
                ].join(" ")}
              >
                Checkout
              </Link>

              <div className="mt-2 text-center text-xs text-slate-500">
                Admin?{" "}
                <Link href="/admin" className="font-semibold underline">
                  Go to dashboard
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
