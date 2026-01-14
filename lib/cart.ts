import type { CartItem, Product } from "./types";

const KEY = "tenpesorun_cart_v1";

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function clearCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function cartSubtotalCents(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.product.price_cents * it.qty, 0);
}

export function upsertCartItem(items: CartItem[], product: Product, delta: number): CartItem[] {
  const next = [...items];
  const idx = next.findIndex((x) => x.product.id === product.id);

  if (idx === -1) {
    if (delta > 0) next.push({ product, qty: delta });
    return next;
  }

  const newQty = next[idx].qty + delta;
  if (newQty <= 0) {
    next.splice(idx, 1);
  } else {
    next[idx] = { ...next[idx], qty: newQty };
  }
  return next;
}
