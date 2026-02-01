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

// Category emoji mapping
function getCategoryEmoji(category: string): string {
  const cat = category.toLowerCase();
  if (cat === "all") return "📦";
  if (cat.includes("biscuit") || cat.includes("cookie")) return "🍪";
  if (cat.includes("coffee") || cat.includes("kape")) return "☕";
  if (cat.includes("drink") || cat.includes("beverage")) return "🥤";
  if (cat.includes("can") || cat.includes("canned")) return "🥫";
  if (cat.includes("noodle") || cat.includes("pasta")) return "🍜";
  if (cat.includes("chip") || cat.includes("snack")) return "🍿";
  if (cat.includes("juice")) return "🧃";
  return "🍱";
}

// Get short category name
function getShortName(category: string): string {
  if (category === ALL) return "All";
  if (category.length <= 3) return category;
  return category.substring(0, 3);
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
      
      // Refresh products
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
      className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="fixed left-0 right-0 top-[48px] z-30 flex items-center justify-center bg-white/95 backdrop-blur-sm transition-all"
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

      {/* Category Tabs - Ultra Compact with Emoji */}
      <div className="sticky top-[48px] z-40 border-b border-stone-100 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex gap-1.5 overflow-x-auto px-4 py-1.5 scrollbar-hide">
            {categories.map((c) => {
              const active = c === activeCat;
              const emoji = getCategoryEmoji(c);
              const shortName = getShortName(c);
              
              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className="flex flex-shrink-0 flex-col items-center gap-0.5 transition"
                >
                  <div
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-full text-base transition",
                      active
                        ? "bg-gradient-to-r from-amber-700 to-amber-900 shadow-sm"
                        : "bg-stone-100 hover:bg-stone-200",
                    ].join(" ")}
                  >
                    <span className={active ? "text-white" : ""}>{emoji}</span>
                  </div>
                  <span
                    className={[
                      "text-xs font-medium",
                      active ? "text-amber-900" : "text-stone-600",
                    ].join(" ")}
                  >
                    {shortName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Promo Banner - Scrolling Animation */}
      <div className="overflow-hidden border-b border-amber-200 bg-gradient-to-r from-amber-500 to-amber-600">
        <div className="animate-marquee whitespace-nowrap py-2 text-sm font-medium text-white">
          {promoText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {promoText}
        </div>
      </div>

      {/* Added to Cart Toast */}
      {addedToCartId && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 animate-in slide-in-from-top-5">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-white shadow-xl">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Added to cart!</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {loadErr && (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div className="text-sm text-red-700">Failed to load products: {loadErr}</div>
        </div>
      )}

      {/* Product Grid - Ultra Tight Spacing */}
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {/* Skeleton Loading Cards */}
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-stone-50 bg-white p-1.5 shadow-md">
                {/* Skeleton Image with Shimmer */}
                <div className="aspect-square animate-shimmer rounded-lg bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:200%_100%]" />
                {/* Skeleton Name */}
                <div className="mt-1.5 h-3 w-full animate-pulse rounded bg-stone-200" />
                <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-stone-200" />
                {/* Skeleton Price */}
                <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-stone-200" />
                {/* Skeleton Button */}
                <div className="mt-1.5 h-8 w-full animate-pulse rounded-xl bg-stone-200" />
              </div>
            ))}

          {/* Actual Product Cards */}
          {!loading && sortedProducts.map((p) => {
            const stock = p.stock_qty ?? 0;
            const out = stock <= 0;
            const low = !out && stock > 0 && stock <= 5;
            const justAdded = addedToCartId === p.id;

            return (
              <div
                key={p.id}
                className={[
                  "group relative overflow-hidden rounded-xl border border-stone-50 bg-white p-1.5 shadow-md transition-all hover:shadow-lg",
                  out ? "opacity-75" : "",
                  justAdded ? "ring-2 ring-emerald-500 ring-offset-2" : "",
                ].join(" ")}
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-stone-50 to-white">
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

                  {/* Stock Badge - Compact */}
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

                {/* Product Info - Compact */}
                <div className="mt-1.5">
                  <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-stone-900">{p.name}</h4>
                  <div className="mt-1 text-sm font-bold text-stone-900">{peso(p.price_cents)}</div>
                </div>

                {/* Add Button - UNCHANGED! PERFECT! */}
                <button
                  disabled={out}
                  onClick={() => add(p)}
                  className={[
                    "mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                    out
                      ? "cursor-not-allowed bg-stone-100 text-stone-400"
                      : "bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950",
                  ].join(" ")}
                >
                  {out ? (
                    "Out"
                  ) : (
                    <>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!loading && sortedProducts.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
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

      {/* Mobile Cart Overlay */}
      {showCartDetails && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCartDetails(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <div className="p-6">
              {/* Cart Header */}
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

              {/* Cart Items */}
              <div className="max-h-[55vh] space-y-3 overflow-auto">
                {!cart.length ? (
                  <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                    <ShoppingCart className="mx-auto h-12 w-12 text-stone-400" />
                    <h4 className="mt-4 font-semibold text-stone-900">Your cart is empty</h4>
                    <p className="mt-2 text-sm text-stone-500">Add some items to get started</p>
                  </div>
                ) : (
                  cart.map((i) => (
                    <div key={i.id} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3">
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
                          >
                            −
                          </button>
                          <div className="min-w-[32px] text-center font-bold text-stone-900">{i.qty}</div>
                          <button
                            onClick={() => setQty(i.id, i.qty + 1)}
                            className="h-8 w-8 rounded-xl border border-amber-700 bg-amber-700 text-white transition hover:bg-amber-800 active:scale-95"
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
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:from-amber-800 hover:to-amber-950 active:scale-[0.98]"
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

      {/* Sticky Cart Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 p-4 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => setShowCartDetails(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-stone-600 to-amber-900 px-5 py-3.5 text-white shadow-lg transition hover:shadow-xl active:scale-[0.98]"
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
      </div>

      {/* Custom Animations */}
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
        
        .touch-target {
          min-height: 44px;
          min-width: 44px;
        }
      `}</style>
    </div>
  );
}
