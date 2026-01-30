"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  ShoppingCart,
  Package,
  ChevronRight,
  Search,
  X,
  CheckCircle,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

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

const CART_KEY = "fds_cart_v1";
const ALL = "All";

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

  // Live updates: keep stock + active flags fresh without polling (cheap on reads)
  useEffect(() => {
    const channel = supabase
      .channel("products-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload: any) => {
          const row = payload.new as Product;

          // Patch visible list
          setProducts((prev) => {
            const next = prev.map((p) => (p.id === row.id ? { ...p, ...row } : p));
            return row.is_active ? next : next.filter((p) => p.id !== row.id);
          });

          // Patch cached category lists (so cache stays fresh)
          setCache((prev) => {
            const next: Record<string, Product[]> = { ...prev };
            for (const key of Object.keys(next)) {
              const list = next[key] ?? [];
              const idx = list.findIndex((p) => p.id === row.id);
              if (idx >= 0) {
                const copy = list.slice();
                const merged = { ...copy[idx], ...row };
                if (!merged.is_active) copy.splice(idx, 1);
                else copy[idx] = merged;
                next[key] = copy;
              }
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);


  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);

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
    setAddedToCartId(p.id);
    setTimeout(() => setAddedToCartId(null), 2000);
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

  const settingOrder: string[] = Array.isArray(settings?.category_order) ? settings.category_order : [];
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState<string>(() => ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [cache, setCache] = useState<Record<string, Product[]>>(() => {
    const all = (initialProducts ?? []) as Product[];
    return all.length ? { [ALL]: all } : ({} as Record<string, Product[]>);
  });

  const [products, setProducts] = useState<Product[]>(() => {
    return (initialProducts ?? []) as Product[];
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [loadErr, setLoadErr] = useState<string | null>(productsError ?? null);

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

    if (activeCat !== ALL && !arr.includes(activeCat)) {
      setActiveCat(ALL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingOrder?.join("|"), cache[ALL]?.length]);

  async function loadProductsFor(cat: string) {
    setLoadErr(null);

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

  useEffect(() => {
    if (!activeCat) return;
    loadProductsFor(activeCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat]);

  const filteredProducts = useMemo(() => {
    const list = (products ?? []).slice();
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const sortedProducts = useMemo(() => {
    const list = filteredProducts.slice();
    list.sort((a, b) => {
      const aOut = (a.stock_qty ?? 0) <= 0;
      const bOut = (b.stock_qty ?? 0) <= 0;

      if (aOut !== bOut) return aOut ? 1 : -1;

      const an = (a.name ?? "").toLowerCase();
      const bn = (b.name ?? "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return list;
  }, [filteredProducts]);

  const heroSubtitle = (settings?.landing_hero_subtitle ?? "Final Destination Services") as string;

  return (
    <div className="min-h-screen">
      {/* Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl px-4 pt-20">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-stone-900">Search Products</h2>
              <button
                onClick={() => setShowSearch(false)}
                className="rounded-full p-2 transition hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or category..."
                className="w-full rounded-2xl border border-stone-300 bg-white py-4 pl-12 pr-4 text-lg shadow-lg focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                autoFocus
              />
            </div>
            {searchQuery && (
              <div className="mt-8">
                <div className="mb-4 text-sm text-stone-500">
                  Found {sortedProducts.length} result{sortedProducts.length !== 1 ? 's' : ''} for "{searchQuery}"
                </div>
                <div className="space-y-3">
                  {sortedProducts.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        add(p);
                        setShowSearch(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-stone-300 hover:shadow-sm"
                    >
                      <div>
                        <div className="font-medium text-stone-900">{p.name}</div>
                        <div className="text-sm text-stone-500">{p.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-stone-900">{peso(p.price_cents)}</div>
                        <ChevronRight className="h-5 w-5 text-stone-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl pb-36 sm:pb-10">
        {/* Hero - Warm Stone to Amber Gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-600 via-stone-700 to-amber-900 p-6 shadow-xl sm:p-9">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative">
            <div className="flex items-center gap-3 text-white">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{heroSubtitle}</h2>
                <p className="mt-1 text-amber-100">Quality products, seamless experience</p>
              </div>
            </div>

            <div className="mt-8">
              {/* Category chips */}
              <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-4 scrollbar-hide">
                {categories.map((c) => {
                  const active = c === activeCat;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setActiveCat(c);
                        setSearchQuery("");
                      }}
                      className={[
                        "group flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                        active
                          ? "border-white bg-white text-amber-800 shadow-lg"
                          : "border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20",
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      {active && <div className="h-1.5 w-1.5 rounded-full bg-amber-700" />}
                      {c}
                      {active && (
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Stats Bar */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-amber-100">
                  <TrendingUp className="h-4 w-4" />
                  <span>{sortedProducts.length} items available</span>
                </div>
                {cartCount > 0 && (
                  <div className="flex items-center gap-2 text-white">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{cartCount} items in cart</span>
                  </div>
                )}
                <button
                  onClick={() => setShowSearch(true)}
                  className="ml-auto flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <Search className="h-4 w-4" />
                  Search products
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Added to Cart Toast */}
        {addedToCartId && (
          <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 animate-in slide-in-from-top-5">
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-white shadow-xl">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Added to cart!</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {loadErr && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div className="text-sm text-red-700">Failed to load products: {loadErr}</div>
          </div>
        )}

        {/* Layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Catalog */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-stone-900 sm:text-2xl">
                  {activeCat === ALL ? "All Products" : activeCat}
                  {searchQuery && (
                    <span className="ml-2 text-lg font-normal text-stone-500">for "{searchQuery}"</span>
                  )}
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {loading ? "Loading products..." : `Browse ${sortedProducts.length} items`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm transition hover:bg-stone-50"
                  >
                    <X className="h-4 w-4" />
                    Clear search
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedProducts.map((p) => {
                const stock = p.stock_qty ?? 0;
                const out = stock <= 0;
                const low = !out && stock > 0 && stock <= 5;
                const justAdded = addedToCartId === p.id;

                return (
                  <div
                    key={p.id}
                    className={[
                      "group relative rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-stone-300 hover:shadow-lg",
                      out ? "opacity-75" : "",
                      justAdded ? "ring-2 ring-emerald-500 ring-offset-2" : "",
                    ].join(" ")}
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-stone-400">
                          <Package className="h-12 w-12 opacity-50" />
                        </div>
                      )}

                      {/* Stock Status Badge */}
                      <div
                        className={[
                          "absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
                          out
                            ? "border-rose-200 bg-rose-100 text-rose-700"
                            : low
                              ? "border-amber-200 bg-amber-100 text-amber-800"
                              : "border-emerald-200 bg-emerald-100 text-emerald-700",
                        ].join(" ")}
                      >
                        {out ? "Out" : low ? `Only ${stock}` : `${stock} available`}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="mt-4">
                      <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-stone-900">{p.name}</h4>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-lg font-bold text-stone-900">{peso(p.price_cents)}</div>
                        {low && (
                          <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                            <Clock className="h-3 w-3" />
                            Low stock
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      disabled={out}
                      onClick={() => add(p)}
                      className={[
                        "mt-4 flex w-full touch-target items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                        out
                          ? "cursor-not-allowed bg-stone-100 text-stone-400"
                          : "bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
                      ].join(" ")}
                    >
                      {out ? (
                        "Out of Stock"
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Empty State */}
              {!loading && sortedProducts.length === 0 && (
                <div className="col-span-full rounded-2xl border-2 border-dashed border-stone-300 bg-gradient-to-br from-stone-50 to-white p-12 text-center">
                  <div className="mx-auto max-w-sm">
                    <Package className="mx-auto h-12 w-12 text-stone-400" />
                    <h4 className="mt-4 text-lg font-semibold text-stone-900">No products found</h4>
                    <p className="mt-2 text-sm text-stone-500">
                      {searchQuery
                        ? `No items match "${searchQuery}" in ${activeCat}`
                        : `No items available in ${activeCat}`}
                    </p>
                    {(searchQuery || activeCat !== ALL) && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setActiveCat(ALL);
                        }}
                        className="mt-4 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:from-amber-800 hover:to-amber-950"
                      >
                        View All Products
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Loading Skeleton */}
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="aspect-square animate-pulse rounded-xl bg-stone-200" />
                    <div className="mt-4 space-y-2">
                      <div className="h-4 animate-pulse rounded bg-stone-200" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
                      <div className="h-6 w-1/2 animate-pulse rounded bg-stone-200" />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Sticky Cart (Desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl">
              {/* Cart Header - Stone to Amber Gradient */}
              <div className="bg-gradient-to-r from-stone-600 to-amber-900 p-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">Your Cart</div>
                      <div className="text-sm text-amber-100">
                        {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} added` : "Empty cart"}
                      </div>
                    </div>
                  </div>
                  {cartCount > 0 && (
                    <div className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{peso(subtotalCents)}</div>
                  )}
                </div>
              </div>

              {/* Cart Items */}
              <div className="p-6">
                <div className="max-h-[50vh] space-y-4 overflow-auto pr-2">
                  {!cart.length ? (
                    <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-gradient-to-br from-stone-50 to-white p-8 text-center">
                      <ShoppingCart className="mx-auto h-12 w-12 text-stone-400" />
                      <h4 className="mt-4 font-semibold text-stone-900">Your cart is empty</h4>
                      <p className="mt-2 text-sm text-stone-500">Add items to get started</p>
                    </div>
                  ) : (
                    cart.map((i) => (
                      <div
                        key={i.id}
                        className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                      >
                        {/* Item Image */}
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                          {i.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={i.photo_url} alt={i.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-stone-400">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="truncate font-semibold text-stone-900">{i.name}</div>
                              <div className="text-sm text-stone-500">{peso(i.price_cents)} each</div>
                            </div>
                            <div className="font-bold tabular-nums text-stone-900">
                              {peso(i.qty * i.price_cents)}
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              onClick={() => setQty(i.id, i.qty - 1)}
                              className="h-9 w-9 rounded-xl border border-stone-200 bg-white text-lg font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                            >
                              −
                            </button>
                            <div className="min-w-[36px] text-center text-base font-bold text-stone-900">{i.qty}</div>
                            <button
                              onClick={() => setQty(i.id, i.qty + 1)}
                              className="h-9 w-9 rounded-xl border border-amber-700 bg-amber-700 text-lg font-semibold text-white transition hover:bg-amber-800"
                            >
                              +
                            </button>
                            <button
                              onClick={() => setQty(i.id, 0)}
                              className="ml-auto rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Summary */}
                {cart.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">Subtotal</span>
                        <span className="font-bold tabular-nums text-stone-900">{peso(subtotalCents)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">Shipping</span>
                        <span className="font-semibold text-emerald-600">Calculated at checkout</span>
                      </div>
                    </div>

                    <button
                      onClick={checkout}
                      className="w-full touch-target rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:from-amber-800 hover:to-amber-950 hover:scale-[1.02] hover:shadow-xl"
                    >
                      Proceed to Checkout
                      <ChevronRight className="ml-2 inline-block h-5 w-5" />
                    </button>

                    <p className="text-center text-xs text-stone-500">Secure checkout powered by FDS</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Cart Overlay */}
      {showCartDetails && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCartDetails(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <div className="p-6">
              {/* Cart Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6 text-stone-900" />
                  <div>
                    <div className="text-lg font-bold text-stone-900">Your Cart</div>
                    <div className="text-sm text-stone-500">
                      {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''}` : "Empty"}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowCartDetails(false)} className="rounded-full p-2 hover:bg-stone-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="max-h-[55vh] space-y-4 overflow-auto">
                {!cart.length ? (
                  <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                    <ShoppingCart className="mx-auto h-12 w-12 text-stone-400" />
                    <h4 className="mt-4 font-semibold text-stone-900">Your cart is empty</h4>
                    <p className="mt-2 text-sm text-stone-500">Add some items to get started</p>
                  </div>
                ) : (
                  cart.map((i) => (
                    <div key={i.id} className="flex gap-3 rounded-2xl border border-stone-200 p-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                        {i.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.photo_url} alt={i.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-stone-400">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between">
                          <div className="truncate">
                            <div className="truncate font-semibold text-stone-900">{i.name}</div>
                            <div className="text-xs text-stone-500">{peso(i.price_cents)} each</div>
                          </div>
                          <div className="font-bold tabular-nums text-stone-900">{peso(i.qty * i.price_cents)}</div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => setQty(i.id, i.qty - 1)}
                            className="h-8 w-8 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50"
                          >
                            −
                          </button>
                          <div className="min-w-[32px] text-center font-bold text-stone-900">{i.qty}</div>
                          <button
                            onClick={() => setQty(i.id, i.qty + 1)}
                            className="h-8 w-8 rounded-xl border border-amber-700 bg-amber-700 text-white hover:bg-amber-800"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Button */}
              {cart.length > 0 && (
                <div className="mt-6 border-t border-stone-200 pt-6">
                  <div className="mb-4 flex justify-between text-sm">
                    <span className="text-stone-600">Subtotal</span>
                    <span className="font-bold tabular-nums text-stone-900">{peso(subtotalCents)}</span>
                  </div>
                  <button
                    onClick={checkout}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-4 text-base font-bold text-white shadow-lg hover:from-amber-800 hover:to-amber-950"
                  >
                    Checkout Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCartDetails(true)}
              className="flex flex-1 items-center justify-between rounded-2xl bg-gradient-to-r from-stone-600 to-amber-900 px-5 py-3 text-white shadow-lg"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5" />
                <div className="text-left">
                  <div className="text-sm font-semibold">View Cart</div>
                  <div className="text-xs opacity-90">
                    {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''}` : "No items"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">{peso(subtotalCents)}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




