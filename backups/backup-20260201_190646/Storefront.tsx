"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  ShoppingCart,
  Package,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Menu,
  Settings,
  Printer,
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

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

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
    setTimeout(() => setAddedToCartId(null), 1500);
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

  const sortedProducts = useMemo(() => {
    const list = (products ?? []).slice();
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
  }, [products]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, 80));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      setStartY(0);

      await loadProductsFor(activeCat);

      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    } else {
      setPullDistance(0);
      setStartY(0);
    }
  };

  const promoText = settings?.promo_text || "🎉 Flash Sale! 20% off all drinks this weekend!";

  return (
    <div
      className="min-h-screen pb-24 lg:pb-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Premium Header - Full Width, Edge-to-Edge */}
      <header className="sticky top-0 z-50 bg-gradient-to-br from-amber-700 to-amber-900 shadow-xl">
        {/* Inner Content with Padding */}
        <div className="px-4 py-4">
          {/* Row 1: Logo + Branding + Hamburger */}
          <div className="mb-3 flex items-center justify-between gap-3">
            {/* Logo + Name + Tagline */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-900 to-amber-950 text-sm font-bold text-white shadow-md">
                FDS
              </div>
              <div className="flex-1">
                <h1 className="text-base font-bold leading-tight text-white">Final Destination Services</h1>
                <p className="text-xs font-light text-white/90">Handling things. Quietly</p>
              </div>
            </div>

            {/* Hamburger Menu */}
            <button
              onClick={() => setShowMenu(true)}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Row 2: Service Pills (White, NOT Full Width) */}
          <div className="scrollbar-hide mb-3 flex gap-3 overflow-x-auto pb-1">
            {/* Printing Service - Active */}
            <a
              href="https://forms.gle/KBhZ8Et4fqdG7g5y5"
              target="_blank"
              rel="noreferrer"
              className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-amber-800 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            >
              <Printer className="h-4 w-4" />
              Printing Service
            </a>

            {/* GCash Service - Coming Soon */}
            <div className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-amber-800 opacity-75 shadow-md">
              <span className="text-base">💰</span>
              <span>GCash Service</span>
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                SOON
              </span>
            </div>

            {/* Easy to add more services here */}
          </div>

          {/* Row 3: Category Pills (Glassmorphism) */}
          <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
            {categories.map((c) => {
              const active = c === activeCat;

              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={[
                    "flex-shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-white text-amber-800 shadow-md"
                      : "border border-white/30 bg-white/20 text-white backdrop-blur-md hover:bg-white/30",
                  ].join(" ")}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtle Gradient Fade Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
      </header>

      {/* Pull-to-Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed left-0 right-0 top-0 z-30 flex items-center justify-center bg-white/95 backdrop-blur-sm transition-all"
          style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}
        >
          <div className="text-center">
            {isRefreshing ? (
              <>
                <div className="mb-1 inline-block h-5 w-5 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                <div className="text-xs text-stone-600">Refreshing...</div>
              </>
            ) : pullDistance > 60 ? (
              <div className="text-xs text-stone-600">↑ Release to refresh</div>
            ) : (
              <div className="text-xs text-stone-600">↓ Pull to refresh</div>
            )}
          </div>
        </div>
      )}

      {/* Hamburger Menu - Slide-in Panel */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed right-0 top-0 z-[70] h-full w-[280px] animate-in slide-in-from-right bg-white shadow-2xl">
            <div className="p-6">
              <button
                onClick={() => setShowMenu(false)}
                className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition-all hover:bg-stone-200 active:scale-95"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-3">
                <a
                  href="/admin"
                  className="flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-stone-900 transition-all hover:bg-amber-50 active:scale-95"
                  onClick={() => setShowMenu(false)}
                >
                  <Settings className="h-5 w-5 text-amber-700" />
                  <span className="font-medium">Admin Panel</span>
                </a>

                <div className="flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-stone-400">
                  <div className="flex h-5 w-5 items-center justify-center text-lg">💰</div>
                  <div className="flex-1">
                    <span className="font-medium">GCash Service</span>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                    SOON
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop Layout with Sidebar */}
      <div className="mx-auto max-w-[1600px] lg:flex lg:gap-6 lg:px-6 lg:py-6">
        <div className="flex-1">
          {/* Promo Banner */}
          <div className="overflow-hidden border-b border-amber-200 bg-gradient-to-r from-amber-500 to-amber-600">
            <div className="animate-marquee whitespace-nowrap py-2 text-sm font-medium text-white sm:py-2.5 lg:py-3 lg:text-base">
              {promoText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {promoText}
            </div>
          </div>

          {/* Added to Cart Toast */}
          {addedToCartId && (
            <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 animate-in slide-in-from-top-5">
              <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-white shadow-xl">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Added to cart!</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {loadErr && (
            <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="text-sm text-red-700">Failed to load products: {loadErr}</div>
            </div>
          )}

          {/* Product Grid */}
          <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4 lg:py-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-stone-100 bg-white p-2 shadow-sm sm:p-2.5 lg:p-3">
                    <div className="aspect-square animate-shimmer rounded-xl bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:200%_100%]" />
                    <div className="mt-1.5 h-3 w-full animate-pulse rounded bg-stone-200 sm:mt-2" />
                    <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-stone-200" />
                    <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-stone-200" />
                    <div className="mt-1.5 h-8 w-full animate-pulse rounded-xl bg-stone-200 sm:h-9 lg:h-10" />
                  </div>
                ))}

              {!loading && sortedProducts.map((p) => {
                const stock = p.stock_qty ?? 0;
                const out = stock <= 0;
                const low = !out && stock > 0 && stock <= 5;
                const justAdded = addedToCartId === p.id;

                return (
                  <div
                    key={p.id}
                    className={[
                      "group relative overflow-hidden rounded-xl border border-stone-100 bg-white p-2 shadow-sm transition-all duration-300 sm:p-2.5 lg:p-3",
                      out ? "opacity-75" : "hover:-translate-y-1 hover:shadow-lg",
                      justAdded ? "ring-2 ring-emerald-500 ring-offset-2" : "",
                    ].join(" ")}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-stone-50 to-white">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-stone-400">
                          <Package className="h-8 w-8 opacity-50" />
                        </div>
                      )}

                      {(out || low) && (
                        <div
                          className={[
                            "absolute right-2 top-2 rounded-lg px-2 py-0.5 text-xs font-semibold shadow-sm",
                            out
                              ? "border border-red-200 bg-red-100 text-red-700"
                              : "border border-amber-200 bg-amber-100 text-amber-800",
                          ].join(" ")}
                        >
                          {out ? "Out" : stock}
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 sm:mt-2">
                      <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-stone-900 sm:text-sm">
                        {p.name}
                      </h4>
                      <div className="mt-1 text-sm font-bold text-stone-900 sm:text-base lg:text-lg">
                        {peso(p.price_cents)}
                      </div>
                    </div>

                    <button
                      disabled={out}
                      onClick={() => add(p)}
                      className={[
                        "mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-95 sm:mt-2 sm:py-2 sm:text-sm lg:py-2.5",
                        out
                          ? "cursor-not-allowed bg-stone-100 text-stone-400"
                          : justAdded
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                          : "bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950",
                      ].join(" ")}
                    >
                      {out ? (
                        "Out"
                      ) : justAdded ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="sm:hidden">Added</span>
                          <span className="hidden sm:inline">Added to Cart</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="sm:hidden">Add</span>
                          <span className="hidden sm:inline">Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {!loading && sortedProducts.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-stone-400" />
                <div className="mt-3 font-medium text-stone-600">No products found</div>
                <div className="mt-1 text-sm text-stone-500">
                  {activeCat === ALL ? "Check back later for new items!" : `No products in ${activeCat} category`}
                </div>
                {activeCat !== ALL && (
                  <button
                    onClick={() => setActiveCat(ALL)}
                    className="mt-4 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:from-amber-800 hover:to-amber-950"
                  >
                    View All Products
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar Cart */}
        <aside className="hidden lg:block lg:w-[380px] lg:flex-shrink-0">
          <div className="sticky top-6 rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-stone-900" />
              <div>
                <div className="text-lg font-bold text-stone-900">Your Cart</div>
                <div className="text-sm text-stone-500">
                  {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Empty"}
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-300px)] space-y-3 overflow-auto">
              {!cart.length ? (
                <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-stone-400" />
                  <h4 className="mt-4 font-semibold text-stone-900">Your cart is empty</h4>
                  <p className="mt-2 text-sm text-stone-500">Add some items to get started</p>
                </div>
              ) : (
                cart.map((i) => (
                  <div key={i.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                      {i.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.photo_url} alt={i.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-stone-400">
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
                          className="h-8 w-8 rounded-xl border border-stone-200 text-stone-700 transition hover:bg-stone-50 active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <div className="min-w-[32px] text-center font-bold text-stone-900">{i.qty}</div>
                        <button
                          onClick={() => setQty(i.id, i.qty + 1)}
                          className="h-8 w-8 rounded-xl border border-amber-700 bg-amber-700 text-white transition hover:bg-amber-800 active:scale-95"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-6 border-t border-stone-200 pt-6">
                <div className="mb-4 flex justify-between text-sm">
                  <span className="text-stone-600">Subtotal</span>
                  <span className="font-bold tabular-nums text-stone-900">{peso(subtotalCents)}</span>
                </div>
                <button
                  onClick={checkout}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:from-amber-800 hover:to-amber-950 active:scale-[0.98]"
                >
                  Checkout Now
                  <ChevronRight className="ml-2 inline-block h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Cart Modal */}
      {showCartDetails && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCartDetails(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6 text-stone-900" />
                  <div>
                    <div className="text-lg font-bold text-stone-900">Your Cart</div>
                    <div className="text-sm text-stone-500">
                      {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Empty"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCartDetails(false)}
                  className="rounded-full p-2 transition hover:bg-stone-100 active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[55vh] space-y-3 overflow-auto">
                {!cart.length ? (
                  <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                    <ShoppingCart className="mx-auto h-12 w-12 text-stone-400" />
                    <h4 className="mt-4 font-semibold text-stone-900">Your cart is empty</h4>
                    <p className="mt-2 text-sm text-stone-500">Add some items to get started</p>
                  </div>
                ) : (
                  cart.map((i) => (
                    <div key={i.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                        {i.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.photo_url} alt={i.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-stone-400">
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
                            className="h-8 w-8 rounded-xl border border-stone-200 text-stone-700 transition hover:bg-stone-50 active:scale-95"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <div className="min-w-[32px] text-center font-bold text-stone-900">{i.qty}</div>
                          <button
                            onClick={() => setQty(i.id, i.qty + 1)}
                            className="h-8 w-8 rounded-xl border border-amber-700 bg-amber-700 text-white transition hover:bg-amber-800 active:scale-95"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="mt-6 border-t border-stone-200 pt-6">
                  <div className="mb-4 flex justify-between text-sm">
                    <span className="text-stone-600">Subtotal</span>
                    <span className="font-bold tabular-nums text-stone-900">{peso(subtotalCents)}</span>
                  </div>
                  <button
                    onClick={checkout}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:from-amber-800 hover:to-amber-950 active:scale-[0.98]"
                  >
                    Checkout Now
                    <ChevronRight className="ml-2 inline-block h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button - NO BORDER! */}
      <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
        <button
          onClick={() => setShowCartDetails(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-stone-600 to-amber-900 px-5 py-3.5 text-white shadow-2xl transition-all hover:shadow-3xl active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-amber-900">
                  {cartCount}
                </div>
              )}
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Cart</div>
              <div className="text-xs opacity-90">
                {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Empty"}
              </div>
            </div>
          </div>
          <div className="text-lg font-bold tabular-nums">{peso(subtotalCents)}</div>
        </button>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }

        .animate-marquee {
          animation: marquee 20s linear infinite;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
