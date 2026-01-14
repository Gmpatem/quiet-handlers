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

/** Stable time string to avoid hydration mismatch */
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
  if (kind === "good") return "bg-emerald-50 text-emerald-700";
  if (kind === "warn") return "bg-amber-50 text-amber-800";
  if (kind === "bad") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

// -------- payment_status enum mapping (no hardcoding) --------
function pickPendingLabel(labels: string[]) {
  const lower = labels.map((x) => x.toLowerCase());
  const i = lower.findIndex((s) => s.includes("pending"));
  if (i >= 0) return labels[i];

  const j = lower.findIndex((s) => s.includes("await") || s.includes("unpaid"));
  if (j >= 0) return labels[j];

  return labels[0] ?? "pending";
}

function pickPaidLabel(labels: string[]) {
  const lower = labels.map((x) => x.toLowerCase());
  const i = lower.findIndex((s) => s.includes("paid") || s.includes("success") || s.includes("complete"));
  if (i >= 0) return labels[i];

  return labels[labels.length - 1] ?? "paid";
}

function pickRejectLabel(labels: string[]) {
  const lower = labels.map((x) => x.toLowerCase());
  const i = lower.findIndex(
    (s) => s.includes("reject") || s.includes("fail") || s.includes("cancel") || s.includes("void") || s.includes("deny")
  );
  if (i >= 0) return labels[i];

  return labels[labels.length - 1] ?? "rejected";
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

  // enum-driven payment statuses for actions
  const [payPending, setPayPending] = useState<string>("pending");
  const [payPaid, setPayPaid] = useState<string>("paid");
  const [payReject, setPayReject] = useState<string>("rejected");

  // Fetch enum labels once (prevents invalid enum input forever)
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
        setPayReject(pickRejectLabel(labels));
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
      } else if (s.includes("fail") || s.includes("reject") || s.includes("cancel") || s.includes("void") || s.includes("deny")) {
        result.set(o.id, { label: latest.status, kind: "bad" });
      } else {
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

      return (
        (o.order_code ?? "").toLowerCase().includes(query) ||
        (o.customer_name ?? "").toLowerCase().includes(query) ||
        (o.contact ?? "").toLowerCase().includes(query)
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
      const { error } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
      if (error) return alert(`Failed: ${error.message}`);
      router.refresh();
    });
  }

  async function setLatestPaymentStatus(orderId: string, nextStatus: string) {
    startTransition(async () => {
      const supabase = supabaseBrowser();

      // find latest payment
      const { data: latest, error: findErr } = await supabase
        .from("payments")
        .select("id, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr) return alert(`Failed: ${findErr.message}`);

      if (latest?.id) {
        const { error } = await supabase.from("payments").update({ status: nextStatus }).eq("id", latest.id);
        if (error) return alert(`Failed: ${error.message}`);
      } else {
        // create payment record if missing
        const { error } = await supabase.from("payments").insert({
          order_id: orderId,
          method: "gcash",
          amount_cents: 0,
          reference_number: null,
          status: nextStatus,
        });
        if (error) return alert(`Failed: ${error.message}`);
      }

      router.refresh();
    });
  }

  function markPaid(orderId: string) {
    return setLatestPaymentStatus(orderId, payPaid);
  }

  function rejectPayment(orderId: string) {
    return setLatestPaymentStatus(orderId, payReject);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Orders</h1>
          <p className="mt-1 text-sm text-slate-600">Review incoming orders, update status, and confirm payments.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search code, name, contact..."
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 md:col-span-2"
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={fulfillment}
            onChange={(e) => setFulfillment(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All fulfill</option>
            <option value="pickup">pickup</option>
            <option value="delivery">delivery</option>
          </select>

          <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="all">All pay</option>
            <option value="gcash">gcash</option>
            <option value="cod">cod</option>
          </select>
        </div>
      </div>

      {isPending && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Updating…</div>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr className="border-b">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Fulfillment</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((o) => {
              const pb = paymentBadge.get(o.id) ?? { label: payPending, kind: "neutral" as const };

              return (
                <tr key={o.id} className="border-b last:border-b-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <button onClick={() => openOrder(o)} className="text-left hover:underline">
                      <div className="font-semibold">{o.order_code ?? o.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">{time(o.created_at)}</div>
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customer_name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{o.contact ?? "—"}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium">{String(o.fulfillment)}</div>
                    {o.fulfillment === "delivery" && (
                      <div className="text-xs text-slate-500">Fee: {peso(o.delivery_fee_cents ?? 0)}</div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium">{String(o.payment_method)}</div>
                    <div className={"mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold " + pillClass(pb.kind)}>
                      {pb.label}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{o.status}</div>
                  </td>

                  <td className="px-4 py-3 text-right font-semibold">{peso(o.total_cents ?? 0)}</td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openOrder(o)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 hover:bg-white"
                      >
                        View
                      </button>

                      <button
                        onClick={() => markPaid(o.id)}
                        className="rounded-xl border border-emerald-200 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50"
                      >
                        Mark Paid
                      </button>

                      <button
                        onClick={() => rejectPayment(o.id)}
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OrderDrawer
        open={open}
        setOpen={setOpen}
        order={activeOrder}
        payments={activeOrder ? paymentsByOrder.get(activeOrder.id) ?? [] : []}
        onUpdateStatus={updateOrderStatus}
      />
    </div>
  );
}
