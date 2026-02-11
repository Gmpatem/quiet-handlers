"use client";
import Link from "next/link";

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
  Home,
  User,
  History,
  MapPin,
  CreditCard,
  HeadphonesIcon,
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

  // FIXED: Show ALL categories with active products (regardless of stock)
  useEffect(() => {
    const all = cache[ALL] ?? [];
    const counts = new Map<string, number>();

    for (const p of all) {
      // Only check if product is active - DON'T check stock here
      if (p.is_active) {
        const cat = normalizeCategory(p.category);
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }

    let arr = Array.from(counts.entries())
      .filter(([, n]) => n > 0) // Categories with active products (even if out of stock)
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
      // Show all products from cache (including out of stock)
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
        const list = ((data ?? []) as Product[]);
        // Store ALL products in cache (including out of stock)
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
    // Sort: in-stock first, then by name
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

  // Enhanced pull-to-refresh with improved visual feedback
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
      setPullDistance(Math.min(distance, 120));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 70 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      setStartY(0);

      await loadProductsFor(activeCat);

      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    } else {
      setPullDistance(0);
      setStartY(0);
    }
  };

  return (
    <div
      className="min-h-screen pb-24 lg:pb-0 bg-gradient-to-b from-stone-50 to-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* FULL WIDTH HEADER - No announcement row */}
      <header className="sticky top-0 z-50 w-full bg-gradient-to-br from-amber-700 to-amber-900 shadow-xl">
        {/* Header Container with NO Top Padding - Full width stretch */}
        <div className="w-full px-4 py-3 sm:px-5 sm:py-4">
          {/* Logo + Branding + Hamburger Row - Centered with proper spacing */}
          <div className="flex items-center justify-between gap-3 mb-4">
            {/* Logo + Branding */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-900 to-amber-950 text-base font-bold text-white shadow-lg">
                FDS
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold leading-tight text-white truncate sm:text-xl">Final Destination Services</h1>
                <p className="text-sm font-light text-white/90 truncate">Handling things. Quietly</p>
              </div>
            </div>

            {/* Hamburger Menu Button - More prominent */}
            <button
              onClick={() => setShowMenu(true)}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/40 bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div><div className="flex gap-3 mb-4 overflow-x-auto scrollbar-hide pb-1">

  {/* Printing */}
  <Link
    href="/services/printing"
    className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-amber-800 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
  >
    <Printer className="h-4 w-4" />
    <span className="whitespace-nowrap">Printing Service</span>
  </Link>

  {/* GCash */}
  <Link
    href="/services/gcash"
    className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-amber-800 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
  >
    <span className="text-base">💰</span>
    <span className="whitespace-nowrap">GCash Service</span>
  </Link>

  {/* Delivery */}
  <Link
    href="/services/delivery"
    className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-amber-800 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
  >
    <span className="text-base">📦</span>
    <span className="whitespace-nowrap">Delivery</span>
  </Link>

</div>


          {/* Category Pills - Full width scrolling, shows ALL categories with active products */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((c) => {
              const active = c === activeCat;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`
                    flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all
                    sm:px-5 sm:py-2.5
                    ${active
                      ? "bg-white text-amber-800 shadow-lg"
                      : "border border-white/40 bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
                    }
                  `}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtle bottom border */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-800/40 to-transparent w-full" />
      </header>

      {/* Pull-to-Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed left-0 right-0 top-0 z-30 flex items-center justify-center bg-gradient-to-b from-amber-50/95 to-white/95 backdrop-blur-sm transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance, 80)}px`,
            opacity: pullDistance > 0 ? 1 : 0
          }}
        >
          <div className="flex flex-col items-center justify-center">
            <div className={`mb-1 h-5 w-5 rounded-full border-2 ${isRefreshing ? 'border-amber-700 border-t-transparent animate-spin' : 'border-amber-700/50'} transition-all`} />
            <div className="text-xs text-stone-700">
              {isRefreshing ? "Refreshing..." : pullDistance > 70 ? "Release to refresh" : "Pull to refresh"}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Hamburger Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed right-0 top-0 z-[70] h-full w-[280px] sm:w-[320px] animate-in slide-in-from-right bg-gradient-to-b from-white to-stone-50 shadow-2xl">
            <div className="flex h-full flex-col">
              {/* Menu Header */}
              <div className="p-6 border-b border-stone-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-sm font-bold text-white">
                      FDS
                    </div>
                    <div>
                      <div className="font-bold text-stone-900">Menu</div>
                      <div className="text-xs text-stone-500">Final Destination Services</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="h-8 w-8 rounded-lg bg-stone-100 text-stone-600 transition-all hover:bg-stone-200 active:scale-95"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4 mx-auto" />
                  </button>
                </div>

                <div className="space-y-1">
                  <a
                    href="/"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-stone-700 transition-all hover:bg-amber-50 active:scale-95"
                    onClick={() => setShowMenu(false)}
                  >
                    <Home className="h-5 w-5 text-amber-700" />
                    <span className="font-medium">Home</span>
                  </a>

                  <a
                    href="/admin"
                    className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-900 transition-all hover:bg-amber-100 active:scale-95"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="h-5 w-5 text-amber-700" />
                    <span className="font-medium">Admin Panel</span>
                    <ChevronRight className="h-4 w-4 ml-auto text-amber-700" />
                  </a>
                </div>
              </div>

              {/* User Services Section */}
              <div className="flex-1 p-6 overflow-auto">
                <h3 className="mb-3 text-sm font-semibold text-stone-500 uppercase tracking-wider">My Account</h3>
                <div className="space-y-1">
                  <a href="#profile" className="flex items-center gap-3 rounded-xl px-4 py-3 text-stone-700 transition-all hover:bg-stone-50">
                    <User className="h-5 w-5 text-stone-600" />
                    <span className="font-medium">My Profile</span>
                  </a>
                  <a href="#orders" className="flex items-center gap-3 rounded-xl px-4 py-3 text-stone-700 transition-all hover:bg-stone-50">
                    <History className="h-5 w-5 text-stone-600" />
                    <span className="font-medium">Order History</span>
                  </a>
                  <a href="#address" className="flex items-center gap-3 rounded-xl px-4 py-3 text-stone-700 transition-all hover:bg-stone-50">
                    <MapPin className="h-5 w-5 text-stone-600" />
                    <span className="font-medium">Delivery Address</span>
                  </a>
                  <a href="#payment" className="flex items-center gap-3 rounded-xl px-4 py-3 text-stone-700 transition-all hover:bg-stone-50">
                    <CreditCard className="h-5 w-5 text-stone-600" />
                    <span className="font-medium">Payment Methods</span>
                  </a>
                </div>

                <h3 className="mt-6 mb-3 text-sm font-semibold text-stone-500 uppercase tracking-wider">Support</h3>
                <div className="space-y-1">
                  <a href="#support" className="flex items-center gap-3 rounded-xl px-4 py-3 text-stone-700 transition-all hover:bg-stone-50">
                    <HeadphonesIcon className="h-5 w-5 text-stone-600" />
                    <span className="font-medium">Customer Support</span>
                  </a>
                </div>
              </div>

              {/* Footer Section */}
              <div className="border-t border-stone-200 p-6">
                <div className="rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 p-4 text-center">
                  <div className="text-xs font-semibold text-amber-900">Final Destination Services</div>
                  <div className="mt-1 text-xs text-amber-700">Campus convenience, handled quietly.</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="mx-auto max-w-[1600px] lg:flex lg:gap-6 lg:px-6 lg:py-6">
        {/* Products Section */}
        <div className="flex-1">
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
            <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:mx-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="text-sm text-red-700">Failed to load products: {loadErr}</div>
            </div>
          )}

          {/* Product Grid - Enhanced Responsive Grid */}
          <div className="px-2 py-3 sm:px-3 sm:py-4 lg:px-4 lg:py-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 xl:gap-5">
              {/* Skeleton Loaders */}
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-stone-100 bg-white p-2 shadow-sm sm:p-2.5 lg:p-3">
                    <div className="aspect-square animate-shimmer rounded-xl bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:200%_100%]" />
                    <div className="mt-1.5 h-3 w-full animate-pulse rounded bg-stone-200" />
                    <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-stone-200" />
                    <div className="mt-1.5 h-8 w-full animate-pulse rounded-xl bg-stone-200" />
                  </div>
                ))}

              {/* Products - Show ALL products including out-of-stock */}
              {!loading && sortedProducts.map((p) => {
                const stock = p.stock_qty ?? 0;
                const out = stock <= 0;
                const low = !out && stock > 0 && stock <= 5;
                const justAdded = addedToCartId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`
                      group relative overflow-hidden rounded-xl border border-stone-100 bg-white p-2 shadow-sm transition-all duration-300
                      sm:p-2.5 lg:p-3
                      ${out ? "opacity-70 grayscale-20" : "hover:-translate-y-1 hover:shadow-md"}
                      ${justAdded ? "ring-2 ring-emerald-500 ring-offset-2" : ""}
                    `}
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-stone-50 to-white">
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-stone-400">
                          <Package className="h-8 w-8 opacity-50 sm:h-10 sm:w-10" />
                        </div>
                      )}

                      {/* Stock Badge - Shows stock quantity with color coding */}
                      <div className={`absolute right-2 top-2 rounded-lg px-1.5 py-0.5 text-xs font-semibold shadow-sm border ${
                        out
                          ? 'border-red-200 bg-red-100 text-red-800'
                          : low
                            ? 'border-amber-200 bg-amber-100 text-amber-800'
                            : 'border-emerald-200 bg-emerald-100 text-emerald-800'
                      }`}>
                        {out ? 'Out' : stock}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="mt-1.5 sm:mt-2">
                      <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-stone-900 sm:text-sm lg:text-sm">
                        {p.name}
                      </h4>
                      <div className="mt-1 font-bold text-stone-900 sm:text-base lg:text-lg">
                        {peso(p.price_cents)}
                      </div>
                      {/* Stock status text */}
                      <div className={`mt-0.5 text-xs font-medium ${
                        out ? 'text-red-600' : low ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {out ? 'Out of stock' : low ? 'Low stock' : 'In stock'}
                      </div>
                    </div>

                    {/* Add to Cart Button - Disabled for out of stock items */}
                    <button
                      onClick={() => add(p)}
                      disabled={out}
                      className={`
                        mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold
                        transition-all duration-300 active:scale-95 sm:mt-2 sm:py-2 sm:text-sm lg:py-2.5
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${justAdded
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                          : out
                            ? "bg-gradient-to-r from-stone-400 to-stone-500 text-white"
                            : "bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950"
                        }
                      `}
                    >
                      {justAdded ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Added</span>
                        </>
                      ) : out ? (
                        <>
                          <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>Out of Stock</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {!loading && sortedProducts.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center sm:p-8">
                <Package className="mx-auto h-12 w-12 text-stone-400 sm:h-16 sm:w-16" />
                <div className="mt-4 text-sm font-medium text-stone-900 sm:text-base">No products found</div>
                <div className="mt-1 text-xs text-stone-600 sm:text-sm">
                  {activeCat === ALL
                    ? "Check back later for new items!"
                    : `No active products in "${activeCat}" category`
                  }
                </div>
                {activeCat !== ALL && (
                  <button
                    onClick={() => setActiveCat(ALL)}
                    className="mt-4 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:from-amber-800 hover:to-amber-950"
                  >
                    View All Categories
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar Cart */}
        <aside className="hidden lg:block lg:w-[380px] xl:w-[420px] lg:flex-shrink-0">
          <div className="sticky top-6 rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-amber-900">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-stone-900">Your Cart</div>
                <div className="text-sm text-stone-500">
                  {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Add items to get started"}
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-320px)] space-y-3 overflow-auto pr-1">
              {!cart.length ? (
                <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-stone-400" />
                  <h4 className="mt-4 text-sm font-semibold text-stone-900">Your cart is empty</h4>
                  <p className="mt-2 text-xs text-stone-500">Add items from the store to see them here</p>
                </div>
              ) : (
                cart.map((i) => (
                  <div key={i.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                      {i.photo_url ? (
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
                          <div className="truncate text-sm font-semibold text-stone-900">{i.name}</div>
                          <div className="text-xs text-stone-500">{peso(i.price_cents)} each</div>
                        </div>
                        <div className="font-bold tabular-nums text-stone-900">{peso(i.qty * i.price_cents)}</div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => setQty(i.id, i.qty - 1)}
                          className="h-7 w-7 rounded-lg border border-stone-200 text-stone-700 transition hover:bg-stone-50 active:scale-95 sm:h-8 sm:w-8 sm:rounded-xl"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <div className="min-w-[28px] text-center font-bold text-stone-900 sm:min-w-[32px]">{i.qty}</div>
                        <button
                          onClick={() => setQty(i.id, i.qty + 1)}
                          className="h-7 w-7 rounded-lg border border-amber-700 bg-amber-700 text-white transition hover:bg-amber-800 active:scale-95 sm:h-8 sm:w-8 sm:rounded-xl"
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
                <div className="mb-4 flex justify-between text-xs text-stone-500">
                  <span>Shipping & taxes calculated at checkout</span>
                </div>
                <button
                  onClick={checkout}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:from-amber-800 hover:to-amber-950 active:scale-[0.98]"
                >
                  Proceed to Checkout
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
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowCartDetails(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-5">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-amber-900">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-stone-900">Your Cart</div>
                    <div className="text-sm text-stone-500">
                      {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Empty"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCartDetails(false)}
                  className="h-8 w-8 rounded-full bg-stone-100 p-1 transition hover:bg-stone-200 active:scale-95"
                >
                  <X className="h-full w-full text-stone-600" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="max-h-[55vh] space-y-3 overflow-auto pb-4">
                {!cart.length ? (
                  <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                    <ShoppingCart className="mx-auto h-12 w-12 text-stone-400" />
                    <h4 className="mt-4 font-semibold text-stone-900">Your cart is empty</h4>
                    <p className="mt-2 text-sm text-stone-500">Add items from the store</p>
                  </div>
                ) : (
                  cart.map((i) => (
                    <div key={i.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                        {i.photo_url ? (
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
                            <div className="truncate text-sm font-semibold text-stone-900">{i.name}</div>
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

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="border-t border-stone-200 pt-5">
                  <div className="mb-4 flex justify-between text-sm">
                    <span className="text-stone-600">Subtotal</span>
                    <span className="font-bold tabular-nums text-stone-900">{peso(subtotalCents)}</span>
                  </div>
                  <button
                    onClick={checkout}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:from-amber-800 hover:to-amber-950 active:scale-[0.98]"
                  >
                    Proceed to Checkout
                    <ChevronRight className="ml-2 inline-block h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STICKY CART BUTTON - Added back to bottom of page */}
      <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
        <button
          onClick={() => setShowCartDetails(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 px-5 py-3.5 text-white shadow-2xl transition-all hover:shadow-3xl active:scale-[0.98]"
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
              <div className="text-sm font-semibold">View Cart</div>
              <div className="text-xs opacity-90">
                {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Your cart is empty"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold tabular-nums">{peso(subtotalCents)}</div>
            <ChevronRight className="h-5 w-5" />
          </div>
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
