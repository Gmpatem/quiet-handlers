"use client";

import { useEffect, useMemo, useState } from "react";

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

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function Storefront({
  settings,
  products,
  productsError,
}: {
  settings: Record<string, any>;
  products: Product[];
  productsError: string | null;
}) {
  const heroTitle = (settings?.landing_hero_title ?? "TenPesoRun") as string;
  const heroSubtitle = (settings?.landing_hero_subtitle ?? "Campus snacks, fast and simple.") as string;

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

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products ?? []) {
      const key = (p.category?.trim() || "Other").trim();
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, items]) => ({
        category,
        id: `cat-${slug(category)}`,
        items: items.sort((x, y) => x.name.localeCompare(y.name)),
      }));
  }, [products]);

  const cartCount = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);
  const subtotalCents = useMemo(() => cart.reduce((a, i) => a + i.qty * i.price_cents, 0), [cart]);

  function add(p: Product) {
    if ((p.stock_qty ?? 0) <= 0) return;
    setCart((prev) => {
      const ex = prev.find((x) => x.id === p.id);
      if (ex) return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { id: p.id, name: p.name, category: p.category, price_cents: p.price_cents, qty: 1, photo_url: p.photo_url }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((x) => x.id !== id);
      return prev.map((x) => (x.id === id ? { ...x, qty } : x));
    });
  }

  function checkout() {
    // checkout page reads CART_KEY
    window.location.href = "/checkout";
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="font-semibold text-slate-900">{heroTitle}</div>

          <div className="flex items-center gap-4">
            <a href="/checkout" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Checkout
            </a>
            <a href="/admin" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Admin
            </a>
            <div className="text-xs text-slate-500">
              {cartCount ? `${cartCount} item(s)` : " "}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-5 pb-36 sm:pb-10">
        {/* Hero */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{heroSubtitle}</h1>
          <p className="mt-2 text-sm text-slate-600">Pick a category, tap to add. Checkout when ready.</p>

          {/* Category chips (mobile-first) */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {grouped.map((g) => (
              <button
                key={g.id}
                onClick={() => document.getElementById(g.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                {g.category}
              </button>
            ))}
          </div>
        </div>

        {productsError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load products: {productsError}
          </div>
        )}

        {/* Layout: catalog + sticky cart (tablet/desktop) */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Catalog */}
          <div>
            {grouped.map((g) => (
              <section key={g.id} id={g.id} className="mt-8 scroll-mt-24">
                <div className="mb-3 flex items-end justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{g.category}</h2>
                  <div className="text-xs text-slate-500">{g.items.length} item(s)</div>
                </div>

                {/* Mobile: 2 cols, Tablet: 3 cols, Desktop: 4 cols */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {g.items.map((p) => {
                    const out = (p.stock_qty ?? 0) <= 0;
                    return (
                      <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {p.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-slate-400">No image</div>
                          )}
                        </div>

                        <div className="mt-2">
                          <div className="line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</div>
                          <div className="mt-1 text-sm font-semibold">{peso(p.price_cents)}</div>
                          <div className="mt-1 text-xs text-slate-500">{out ? "Out of stock" : `Stock: ${p.stock_qty}`}</div>
                        </div>

                        <button
                          disabled={out}
                          onClick={() => add(p)}
                          className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {!products?.length && !productsError && (
              <div className="mt-10 rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
                No products available right now.
              </div>
            )}
          </div>

          {/* Sticky cart panel (tablet/desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-3xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">Cart</div>
                <div className="text-xs text-slate-500">{cartCount ? `${cartCount} item(s)` : "Empty"}</div>
              </div>

              <div className="mt-3 max-h-[55vh] overflow-auto space-y-3">
                {!cart.length ? (
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
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
                          <button onClick={() => setQty(i.id, i.qty - 1)} className="h-8 w-8 rounded-xl border border-slate-200 hover:bg-slate-50">-</button>
                          <div className="min-w-[28px] text-center text-sm font-semibold">{i.qty}</div>
                          <button onClick={() => setQty(i.id, i.qty + 1)} className="h-8 w-8 rounded-xl border border-slate-200 hover:bg-slate-50">+</button>
                          <div className="ml-auto text-sm font-semibold">{peso(i.qty * i.price_cents)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold">{peso(subtotalCents)}</span>
                </div>

                <button
                  disabled={!cart.length}
                  onClick={checkout}
                  className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile always-visible cart panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white lg:hidden">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Cart</div>
              <div className="text-xs text-slate-500">{cartCount ? `${cartCount} item(s)` : "Empty"}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Subtotal</div>
              <div className="text-sm font-semibold">{peso(subtotalCents)}</div>
            </div>
          </div>

          {/* small always-visible list */}
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {!cart.length ? (
              <div className="text-sm text-slate-600">Add items above.</div>
            ) : (
              cart.map((i) => (
                <div key={i.id} className="min-w-[220px] rounded-2xl border border-slate-200 p-2">
                  <div className="text-sm font-semibold line-clamp-1">{i.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <button onClick={() => setQty(i.id, i.qty - 1)} className="h-8 w-8 rounded-xl border border-slate-200">-</button>
                    <div className="min-w-[22px] text-center text-sm font-semibold">{i.qty}</div>
                    <button onClick={() => setQty(i.id, i.qty + 1)} className="h-8 w-8 rounded-xl border border-slate-200">+</button>
                    <div className="ml-auto text-xs font-semibold">{peso(i.qty * i.price_cents)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            disabled={!cart.length}
            onClick={checkout}
            className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

