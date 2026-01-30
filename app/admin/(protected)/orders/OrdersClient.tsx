"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import OrderDrawer from "./OrderDrawer";

export type OrderRow = {
  id: string;
  order_code: string | null;
  customer_name: string | null;
  contact: string | null;
  notes: string | null;
  fulfillment: "pickup" | "delivery" | string;
  pickup_location: string | null;
  delivery_fee_cents: number;
  delivery_location: string | null;
  payment_method: "gcash" | "cod" | string;
  subtotal_cents: number;
  total_cents: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  order_id: string;
  method: string;
  amount_cents: number;
  reference_number: string | null;
  status: string;
  created_at: string;
};

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

function time(ts: string) {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return ts;
  }
}

function pillClass(kind: "good" | "warn" | "bad" | "neutral") {
  if (kind === "good") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (kind === "warn") return "bg-amber-50 text-amber-800 border border-amber-200";
  if (kind === "bad") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-stone-100 text-stone-700 border border-stone-200";
}

function pickupLabel(pickup_location: string | null, notes: string | null) {
  const p = (pickup_location ?? "").toLowerCase();
  if (p.includes("boys") || p.includes("411")) return "Boys 411";
  if (p.includes("girls") || p.includes("206")) return "Girls 206";
  const n = (notes ?? "").toLowerCase();
  if (n.includes("boys dorm") || n.includes("room 411")) return "Boys 411";
  if (n.includes("girls dorm") || n.includes("room 206")) return "Girls 206";
  return "—";
}

function pickPendingLabel(labels: string[]) {
  const lower = labels.map((x) => x.toLowerCase());
  const i = lower.findIndex((s) => s.includes("pending") || s.includes("unpaid") || s.includes("await"));
  if (i >= 0) return labels[i];
  return labels[0] ?? "pending";
}

function pickPaidLabel(labels: string[]) {
  const lower = labels.map((x) => x.toLowerCase());
  const i = lower.findIndex((s) => s.includes("paid") || s.includes("success") || s.includes("complete"));
  if (i >= 0) return labels[i];
  return labels[labels.length - 1] ?? "paid";
}

/**
 * RPC helper that tries multiple param shapes.
 * This keeps us compatible even if function param names differ.
 */
async function rpcTry(supabase: any, fn: string, variants: Record<string, any>[]) {
  let lastErr: any = null;
  for (const args of variants) {
    const { data, error } = await supabase.rpc(fn, args);
    if (!error) return { data, error: null };
    lastErr = error;
  }
  return { data: null, error: lastErr };
}

export default function OrdersClient({
  initialOrders,
  initialPayments,
}: {
  initialOrders: OrderRow[];
  initialPayments: PaymentRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [fulfillment, setFulfillment] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderRow | null>(null);

  const [payPending, setPayPending] = useState<string>("pending");
  const [payPaid, setPayPaid] = useState<string>("paid");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase.rpc("get_payment_status_enum");
        if (error) return;
        if (!Array.isArray(data) || data.length === 0) return;
        const labels = data.map(String);
        if (cancelled) return;
        setPayPending(pickPendingLabel(labels));
        setPayPaid(pickPaidLabel(labels));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const paymentsByOrder = useMemo(() => {
    const map = new Map<string, PaymentRow[]>();
    for (const p of initialPayments ?? []) {
      map.set(p.order_id, [...(map.get(p.order_id) ?? []), p]);
    }
    return map;
  }, [initialPayments]);

  const paymentBadge = useMemo(() => {
    const result = new Map<string, { label: string; kind: "good" | "warn" | "bad" | "neutral" }>();
    for (const o of initialOrders ?? []) {
      const pays = paymentsByOrder.get(o.id) ?? [];
      if (!pays.length) {
        result.set(o.id, { label: "no payment", kind: "neutral" });
        continue;
      }
      const latest = [...pays].sort((a, b) => (a.created_at > b.created_at ? -1 : 1))[0];
      const s = (latest.status || "").toLowerCase();
      if (s.includes("paid") || s.includes("success") || s.includes("complete")) {
        result.set(o.id, { label: latest.status, kind: "good" });
      } else {
        // Only pending/paid exist in your enum; treat anything else as warn
        result.set(o.id, { label: latest.status, kind: "warn" });
      }
    }
    return result;
  }, [initialOrders, paymentsByOrder]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (initialOrders ?? []).filter((o) => {
      if (status !== "all" && String(o.status) !== status) return false;
      if (fulfillment !== "all" && String(o.fulfillment) !== fulfillment) return false;
      if (method !== "all" && String(o.payment_method) !== method) return false;
      if (!query) return true;
      const pickup = pickupLabel(o.pickup_location, o.notes).toLowerCase();
      return (
        (o.order_code ?? "").toLowerCase().includes(query) ||
        (o.customer_name ?? "").toLowerCase().includes(query) ||
        (o.contact ?? "").toLowerCase().includes(query) ||
        pickup.includes(query)
      );
    });
  }, [initialOrders, q, status, fulfillment, method]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of initialOrders ?? []) set.add(String(o.status));
    return ["all", ...Array.from(set).sort()];
  }, [initialOrders]);

  function openOrder(o: OrderRow) {
    setActiveOrder(o);
    setOpen(true);
  }

  async function updateOrderStatus(orderId: string, next: string) {
    startTransition(async () => {
      const supabase = supabaseBrowser();

      // ✅ RPC ONLY
      const { error } = await rpcTry(supabase, "admin_set_order_status", [
        { order_id: orderId, status: next },
        { order_id: orderId, next_status: next },
        { p_order_id: orderId, p_status: next },
        { p_order_id: orderId, p_next_status: next },
      ]);

      if (error) return alert(`Failed: ${error.message}`);
      router.refresh();
    });
  }

  async function confirmOrder(orderId: string) {
    startTransition(async () => {
      const supabase = supabaseBrowser();

      // Try admin_confirm_order first, fallback to status=confirmed
      const r1 = await rpcTry(supabase, "admin_confirm_order", [
        { order_id: orderId },
        { p_order_id: orderId },
      ]);

      if (!r1.error) {
        router.refresh();
        return;
      }

      const r2 = await rpcTry(supabase, "admin_set_order_status", [
        { order_id: orderId, status: "confirmed" },
        { p_order_id: orderId, p_status: "confirmed" },
      ]);

      if (r2.error) return alert(`Failed: ${r2.error.message}`);
      router.refresh();
    });
  }

  async function markPaid(orderId: string) {
    startTransition(async () => {
      const supabase = supabaseBrowser();

      // ✅ RPC ONLY (no payments.update/insert)
      // Prefer specific function if present
      const r1 = await rpcTry(supabase, "admin_verify_gcash_paid", [
        { order_id: orderId },
        { p_order_id: orderId },
      ]);

      if (!r1.error) {
        router.refresh();
        return;
      }

      // Fallback to generic admin_verify_payment if your DB uses that naming
      const r2 = await rpcTry(supabase, "admin_verify_payment", [
        { order_id: orderId, status: payPaid },
        { p_order_id: orderId, p_status: payPaid },
      ]);

      if (r2.error) return alert(`Failed: ${r2.error.message}`);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-stone-900">Orders</h1>
        <p className="mt-1 text-sm text-stone-600">Manage orders on the go</p>
      </div>

      <div className="space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search orders..."
          className="w-full touch-target rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
        />

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="touch-target flex-shrink-0 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-700"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>

          <select
            value={fulfillment}
            onChange={(e) => setFulfillment(e.target.value)}
            className="touch-target flex-shrink-0 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-700"
          >
            <option value="all">All</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="touch-target flex-shrink-0 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-700"
          >
            <option value="all">All</option>
            <option value="gcash">GCash</option>
            <option value="cod">COD</option>
          </select>
        </div>
      </div>

      {isPending && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Updating…
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="grid gap-3 lg:hidden">
          {filtered.map((o) => {
            const pb = paymentBadge.get(o.id) ?? { label: payPending, kind: "neutral" as const };
            return (
              <div key={o.id} className="touch-target rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition active:scale-[0.98]">
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex-1">
                    <button onClick={() => openOrder(o)} className="text-left">
                      <div className="font-semibold text-stone-900">{o.order_code ?? o.id.slice(0, 8)}</div>
                      <div className="text-xs text-stone-500">{time(o.created_at)}</div>
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-stone-900">{peso(o.total_cents ?? 0)}</div>
                    <div className={"mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold " + pillClass(pb.kind)}>
                      {pb.label}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Customer</span>
                    <span className="font-medium text-stone-900">{o.customer_name ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Pickup</span>
                    <span className="font-medium text-stone-900">{pickupLabel(o.pickup_location, o.notes)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Payment</span>
                    <span className="font-medium text-stone-900">{String(o.payment_method).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Status</span>
                    <div className="inline-flex rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                      {o.status}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3">
                  <button
                    onClick={() => openOrder(o)}
                    className="touch-target rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition active:scale-95"
                  >
                    View
                  </button>
                  <button
                    onClick={() => confirmOrder(o.id)}
                    className="touch-target rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition active:scale-95"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => markPaid(o.id)}
                    className="touch-target rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition active:scale-95"
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            );
          })}

          {!filtered.length && (
            <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <div className="text-sm text-stone-600">No orders found.</div>
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 shadow-sm lg:block">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-br from-stone-50 to-white text-left text-stone-600">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Pickup</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filtered.map((o) => {
                const pb = paymentBadge.get(o.id) ?? { label: payPending, kind: "neutral" as const };
                return (
                  <tr key={o.id} className="border-b border-stone-200 last:border-b-0 transition hover:bg-stone-50/50">
                    <td className="px-4 py-3">
                      <button onClick={() => openOrder(o)} className="text-left transition hover:underline">
                        <div className="font-semibold text-stone-900">{o.order_code ?? o.id.slice(0, 8)}</div>
                        <div className="text-xs text-stone-500">{time(o.created_at)}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{o.customer_name ?? "—"}</div>
                      <div className="text-xs text-stone-500">{o.contact ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{pickupLabel(o.pickup_location, o.notes)}</div>
                      <div className="text-xs text-stone-500">{String(o.fulfillment)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{String(o.payment_method)}</div>
                      <div className={"mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold " + pillClass(pb.kind)}>
                        {pb.label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                        {o.status}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-900">{peso(o.total_cents ?? 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openOrder(o)}
                          className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => confirmOrder(o.id)}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 transition hover:bg-amber-100"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => markPaid(o.id)}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Mark Paid
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-600">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDrawer
        open={open}
        setOpen={setOpen}
        order={activeOrder}
        payments={activeOrder ? paymentsByOrder.get(activeOrder.id) ?? [] : []}
        onUpdateStatus={updateOrderStatus}
        pickupLabel={(o) => pickupLabel(o.pickup_location, o.notes)}
      />
    </div>
  );
}
