"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Package,
  ShoppingBag,
  Info,
  X,
  CreditCard,
} from "lucide-react";
import { formatPeso } from "@/lib/utils";
import { submitCreditOrder } from "@/app/services/credit/actions";

export type CreditProduct = {
  id: string;
  name: string;
  category: string | null;
  price_cents: number;
  stock_qty: number;
  is_active: boolean;
  photo_url: string | null;
  badge_text?: string | null;
};

export type CreditServiceClientProps = {
  initialProducts: CreditProduct[];
};

export default function CreditServiceClient({
  initialProducts,
}: CreditServiceClientProps) {
  // Navigation step: 1 = Catalogue, 2 = Name & Confirm, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Search & category
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Cart: Map of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Identity & Submission
  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderResult, setOrderResult] = useState<{
    orderCode: string;
    totalCents: number;
  } | null>(null);

  // Load saved name from localStorage for fast subsequent purchases
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fds_user_name");
      if (saved) setCustomerName(saved);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Extract existing categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of initialProducts) {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim().toUpperCase());
      }
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [initialProducts]);

  // Filtered catalogue
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialProducts.filter((p) => {
      if (p.stock_qty < 0) return false;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === "ALL" ||
        (p.category && p.category.toUpperCase() === selectedCategory);

      return matchesQuery && matchesCat;
    });
  }, [initialProducts, searchQuery, selectedCategory]);

  // Product map for quick lookup
  const productMap = useMemo(() => {
    return new Map(initialProducts.map((p) => [p.id, p]));
  }, [initialProducts]);

  // Cart summary calculations
  const cartItemsList = useMemo(() => {
    return Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = productMap.get(id);
        return {
          productId: id,
          product,
          quantity: qty,
          subtotalCents: (product?.price_cents ?? 0) * qty,
        };
      })
      .filter((item) => item.product !== undefined);
  }, [cart, productMap]);

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, q) => sum + q, 0);
  }, [cart]);

  const totalCartCents = useMemo(() => {
    return cartItemsList.reduce((sum, item) => sum + item.subtotalCents, 0);
  }, [cartItemsList]);

  // Quantity modifiers
  const handleSetQuantity = (productId: string, newQty: number) => {
    const product = productMap.get(productId);
    if (!product) return;

    if (newQty <= 0) {
      setCart((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }

    const clampedQty = Math.min(newQty, product.stock_qty);
    setCart((prev) => ({
      ...prev,
      [productId]: clampedQty,
    }));
  };

  const handleIncrement = (productId: string) => {
    const current = cart[productId] || 0;
    const product = productMap.get(productId);
    if (!product) return;
    if (current < product.stock_qty) {
      handleSetQuantity(productId, current + 1);
    }
  };

  const handleDecrement = (productId: string) => {
    const current = cart[productId] || 0;
    handleSetQuantity(productId, current - 1);
  };

  // Submit order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = customerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your name / room");
      return;
    }

    if (cartItemsList.length === 0) {
      setError("Your cart is empty. Please pick at least one product.");
      return;
    }

    console.log("[CreditClient] handleSubmitOrder started, name:", trimmedName, "items:", cartItemsList.length);
    setError("");
    setIsSubmitting(true);

    try {
      // Save name for convenience
      try {
        localStorage.setItem("fds_user_name", trimmedName);
      } catch {}

      console.log("[CreditClient] calling submitCreditOrder...");
      const res = await submitCreditOrder({
        customerName: trimmedName,
        items: cartItemsList.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      console.log("[CreditClient] submitCreditOrder response:", res);

      if (!res.success || !res.orderCode) {
        setError(res.error || "Failed to submit credit order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setOrderResult({
        orderCode: res.orderCode,
        totalCents: res.totalCents ?? totalCartCents,
      });
      setCart({});
      setStep(3);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCart({});
    setError("");
    setOrderResult(null);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-28 pt-4 px-3 sm:px-6">
      <div className="mx-auto max-w-lg">
        {/* ================= STEP 1: CATALOGUE ================= */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-stone-900">
                  TAKE ON CREDIT
                </h1>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Pick what you need. Pay later at Room 411.
                </p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-md">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-stone-900 placeholder:text-stone-400 outline-none shadow-sm focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Chips */}
            {categories.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      selectedCategory === cat
                        ? "bg-amber-800 text-white shadow-sm"
                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Product Shelf Grid (2 columns on mobile) */}
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-8 text-center">
                <Package className="mx-auto h-10 w-10 text-stone-300 mb-2" />
                <p className="text-sm font-bold text-stone-700">No items found</p>
                <p className="text-xs text-stone-400 mt-1">
                  Try searching with a different keyword or category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const currentQty = cart[product.id] || 0;
                  const isOutOfStock = product.stock_qty <= 0;

                  return (
                    <div
                      key={product.id}
                      className={`flex flex-col justify-between rounded-2xl border bg-white p-3 shadow-sm transition ${
                        currentQty > 0
                          ? "border-amber-700 ring-2 ring-amber-700/10 shadow-md"
                          : "border-stone-200"
                      }`}
                    >
                      <div>
                        {/* Image / Fallback Placeholder */}
                        <div className="relative mb-2.5 aspect-square w-full overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                          {product.photo_url ? (
                            <img
                              src={product.photo_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <ShoppingBag className="h-10 w-10 text-stone-300" />
                          )}

                          {product.badge_text && (
                            <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-800 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                              {product.badge_text}
                            </span>
                          )}

                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px]">
                              <span className="rounded-lg bg-stone-900 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title & Price */}
                        <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm font-black text-amber-800">
                          {formatPeso(product.price_cents)}
                        </p>
                      </div>

                      {/* Stock availability & Action */}
                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span
                          className={`text-[11px] font-semibold ${
                            isOutOfStock
                              ? "text-red-500 font-bold"
                              : product.stock_qty <= 3
                              ? "text-orange-600 font-bold"
                              : "text-stone-500"
                          }`}
                        >
                          {isOutOfStock
                            ? "0 available"
                            : `${product.stock_qty} left`}
                        </span>

                        {/* Direct Quantity Controls on Card */}
                        {currentQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleIncrement(product.id)}
                            disabled={isOutOfStock}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-800 text-white shadow-sm hover:bg-amber-900 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            aria-label={`Add ${product.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 p-0.5 border border-amber-200">
                            <button
                              type="button"
                              onClick={() => handleDecrement(product.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-stone-700 shadow-xs hover:bg-stone-100 active:scale-95 transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[1.25rem] text-center text-xs font-black text-amber-900">
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncrement(product.id)}
                              disabled={currentQty >= product.stock_qty}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-800 text-white shadow-xs hover:bg-amber-900 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STICKY BOTTOM MINI CART */}
            {totalCartCount > 0 && (
              <div className="fixed bottom-3 left-3 right-3 mx-auto max-w-lg z-40">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-900 p-3.5 text-white shadow-2xl border border-stone-800 backdrop-blur-md">
                  <div
                    onClick={() => setIsCartModalOpen(true)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-amber-500 px-2 py-0.5 text-xs font-black text-stone-950">
                        {totalCartCount} {totalCartCount === 1 ? "ITEM" : "ITEMS"}
                      </span>
                      <span className="text-base font-black text-white">
                        {formatPeso(totalCartCents)}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Tap to review cart
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCartModalOpen(true)}
                      className="rounded-xl bg-stone-800 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-stone-700 transition"
                    >
                      VIEW
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-500 shadow-sm active:scale-95 transition"
                    >
                      CONTINUE <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= CART REVIEW MODAL ================= */}
        {isCartModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-stone-100 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-amber-800" />
                  <h2 className="text-base font-bold text-stone-900">
                    YOUR CREDIT CART ({totalCartCount})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartModalOpen(false)}
                  className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-stone-100 space-y-3">
                {cartItemsList.map((item) => (
                  <div
                    key={item.productId}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-900 truncate">
                        {item.product?.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {formatPeso(item.product?.price_cents ?? 0)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item.productId)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-stone-700 shadow-xs hover:bg-stone-50"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-xs font-bold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.productId)}
                          disabled={item.quantity >= (item.product?.stock_qty ?? 0)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-800 text-white shadow-xs hover:bg-amber-900 disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <span className="min-w-[4rem] text-right text-sm font-black text-amber-800">
                        {formatPeso(item.subtotalCents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-stone-100 bg-stone-50 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    TOTAL CREDIT
                  </span>
                  <span className="text-xl font-black text-amber-800">
                    {formatPeso(totalCartCents)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCart({})}
                    className="flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" /> Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartModalOpen(false);
                      setStep(2);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-amber-800 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-900 active:scale-[0.99] transition"
                  >
                    CONTINUE TO CONFIRM <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: NAME & CONFIRM ================= */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-50 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-black text-stone-900">
                  CONFIRM CREDIT ORDER
                </h1>
                <p className="text-xs text-stone-500">
                  Enter your name to record your credit.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* ONLY ONE CUSTOMER FIELD: NAME / ROOM */}
              <div className="rounded-2xl border-2 border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  YOUR NAME / ROOM <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="e.g. Juan Dela Cruz (Room 411)"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 transition"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-stone-400">
                  No login required. We record this directly under your credit balance.
                </p>
              </div>

              {/* Order Items Breakdown */}
              <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    YOUR ITEMS ({totalCartCount})
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-amber-800 hover:underline"
                  >
                    Edit Cart
                  </button>
                </div>

                <div className="space-y-2.5 divide-y divide-stone-100">
                  {cartItemsList.map((item) => (
                    <div
                      key={item.productId}
                      className="pt-2 first:pt-0 flex items-center justify-between text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-800">
                          {item.quantity}×
                        </span>
                        <span className="font-semibold text-stone-900">
                          {item.product?.name}
                        </span>
                      </div>
                      <span className="font-black text-stone-900">
                        {formatPeso(item.subtotalCents)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-dashed border-stone-200 pt-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                    TOTAL CREDIT DUE
                  </span>
                  <span className="text-2xl font-black text-amber-800">
                    {formatPeso(totalCartCents)}
                  </span>
                </div>
              </div>

              {/* Terms Info */}
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900">
                <Info className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  By submitting, this amount is added to your credit ledger. Settle your balance anytime at Room 411 or via GCash.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || cartItemsList.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 py-4 text-sm font-bold text-white shadow-lg hover:from-amber-800 hover:to-amber-950 active:scale-[0.99] disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    RECORDING CREDIT ORDER...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    SUBMIT CREDIT ORDER ({formatPeso(totalCartCents)})
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= STEP 3: SUCCESS ================= */}
        {step === 3 && orderResult && (
          <div className="space-y-6 pt-4 text-center">
            <div className="rounded-3xl border-2 border-stone-200 bg-white p-6 sm:p-8 shadow-xl space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-stone-900">
                  CREDIT RECORDED
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Your order has been recorded into the store system.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  TOTAL AMOUNT CHARGED
                </p>
                <p className="text-3xl font-black text-amber-800">
                  {formatPeso(orderResult.totalCents)}
                </p>
                <div className="pt-2 border-t border-stone-200">
                  <span className="text-[11px] text-stone-400 block mb-0.5">
                    Order Reference
                  </span>
                  <span className="font-mono text-sm font-bold text-stone-800">
                    {orderResult.orderCode}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 text-left">
                <p className="font-bold mb-0.5">Next Steps:</p>
                <p>
                  Please pick up your items at Room 411. You can settle your credit balance anytime at the counter.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-2xl bg-amber-800 py-3.5 text-sm font-bold text-white shadow-md hover:bg-amber-900 active:scale-[0.99] transition"
              >
                DONE / NEW ORDER
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
