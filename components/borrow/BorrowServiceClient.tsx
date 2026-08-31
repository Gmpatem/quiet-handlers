"use client";

import { useState, useEffect } from "react";
import { Package, User, Minus, Plus, Bookmark, CheckCircle, Info, Send } from "lucide-react";

export type BorrowableItem = {
  id: string;
  name: string;
  stock_qty: number;
};

export type BorrowServiceClientProps = {
  initialItems: BorrowableItem[];
};

export default function BorrowServiceClient({ initialItems }: BorrowServiceClientProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem("fds_user_name");
    if (savedName) setName(savedName);
  }, []);

  const selectedItem = initialItems.find((i) => i.id === itemId);
  const maxAvailable = selectedItem ? Math.max(1, selectedItem.stock_qty) : 99;

  const adjustQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(maxAvailable, prev + delta)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name / room");
      return;
    }
    if (!itemId) {
      setError("Please select an item");
      return;
    }

    setIsSubmitting(true);
    try {
      localStorage.setItem("fds_user_name", name);

      const { submitBorrowRequest } = await import("@/app/services/borrow/actions");
      const result = await submitBorrowRequest({
        borrowerName: name.trim(),
        itemId,
        quantity,
      });

      if (result.success) {
        setSuccess(true);
        setItemId("");
        setQuantity(1);
      } else {
        setError(result.error || "Failed to submit borrowing");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit borrowing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-700" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Borrowing recorded</h2>
          <p className="mt-1 text-sm text-stone-600">Please return it on time 🙂</p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 py-3 font-semibold text-white shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white px-4 pb-28 pt-6">
      <div className="mx-auto max-w-sm">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">BORROW HERE</h1>
            <p className="text-sm text-stone-500">Borrow today, return tomorrow.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name / Room */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-stone-700">
              Your Name / Room
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name / room"
                className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                required
              />
            </div>
          </div>

          {/* Item */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-stone-700">
              Item
            </label>
            <div className="relative">
              <Bookmark className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                required
              >
                <option value="" disabled>
                  Select item
                </option>
                {initialItems.map((item) => (
                  <option key={item.id} value={item.id} disabled={item.stock_qty <= 0}>
                    {item.name} {item.stock_qty > 0 ? `(${item.stock_qty} available)` : "(out of stock)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-stone-700">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => adjustQuantity(-1)}
                className="touch-target flex items-center justify-center rounded-xl border border-stone-200 bg-white p-3 text-stone-700 transition hover:bg-stone-50"
                aria-label="Decrease quantity"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="flex-1 rounded-xl border border-stone-200 bg-white py-3 text-center text-lg font-semibold text-stone-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => adjustQuantity(1)}
                className="touch-target flex items-center justify-center rounded-xl border border-stone-200 bg-white p-3 text-stone-700 transition hover:bg-stone-50"
                aria-label="Increase quantity"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" />
            <p className="text-sm leading-relaxed text-emerald-900">
              This will be recorded as <strong>BORROWING</strong> automatically.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || initialItems.length === 0}
            className="fixed bottom-4 left-4 right-4 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60 sm:static sm:w-full"
          >
            <Send className="h-5 w-5" />
            {isSubmitting ? "Submitting..." : "BORROW ITEM"}
          </button>
        </form>
      </div>
    </div>
  );
}
