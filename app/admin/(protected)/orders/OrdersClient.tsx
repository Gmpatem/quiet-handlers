"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { getCreditBalanceDue, isPaymentSettled } from "@/lib/payments";
import { Search, Package, Clock, CheckCircle, XCircle, Truck, AlertCircle, Wallet } from "lucide-react";

export type OrderRow = {
  id: string;
  order_code: string | null;
  customer_name: string | null;
  contact: string | null;
  notes: string | null;
  fulfillment: string | null;
  pickup_location: string | null;
  delivery_fee_cents: number | null;
  delivery_location: string | null;
  payment_method: string | null;
  subtotal_cents: number | null;
  total_cents: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  order_id: string;
  method: string | null;
  amount_cents: number | null;
  balance_due_cents: number | null;
  reference_number: string | null;
  gcash_ref: string | null;
  proof_url: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  name_snapshot: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
};

type RawOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name_snapshot: string | null;
  unit_price_cents: number | null;
  line_total_cents: number | null;
  qty: number;
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

function normalizeItems(input: any[] | null | undefined): OrderItemRow[] {
  const arr = (input ?? []) as any[];
  return arr.map((r) => ({
    id: String(r.id),
    order_id: String(r.order_id),
    product_id: r.product_id ?? null,
    name_snapshot: String(r.name_snapshot ?? ""),
    qty: Number(r.qty ?? 0),
    unit_price_cents: Number(r.unit_price_cents ?? 0),
    line_total_cents: Number(r.line_total_cents ?? 0),
  }));
}

export default function OrdersClient({
  initialOrders,
  initialPayments,
  initialItems,
}: {
  initialOrders: OrderRow[];
  initialPayments: PaymentRow[];
  initialItems: OrderItemRow[];
}) {
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders ?? []);
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments ?? []);
  const [items, setItems] = useState<OrderItemRow[]>(normalizeItems(initialItems));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => setMounted(true), []);

  const supabase = useMemo(() => supabaseBrowser(), []);

  const filteredOrders = useMemo(() => {
    let result = orders ?? [];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          (o.order_code ?? "").toLowerCase().includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q) ||
          (o.contact ?? "").toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((o) => (o.status ?? "pending") === statusFilter);
    }

    return result;
  }, [orders, search, statusFilter]);

  // ✅ ITEMIZATION FIX: fetch order_items using REAL column names (name_snapshot, unit_price_cents)
  useEffect(() => {
    if (!mounted) return;

    const visibleOrderIds = (filteredOrders ?? []).map((o) => o.id);
    if (visibleOrderIds.length === 0) return;

    // If we already have at least one item for visible orders, don't refetch.
    const haveAnyForVisible = (items ?? []).some((it) => visibleOrderIds.includes(it.order_id));
    if (haveAnyForVisible) return;

    let cancelled = false;

    async function loadItemsForVisibleOrders() {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, order_id, product_id, name_snapshot, unit_price_cents, line_total_cents, qty")
        .in("order_id", visibleOrderIds);

      if (cancelled) return;

      if (error) {
        console.error("Failed to load order_items:", error);
        return;
      }

      const incomingRaw = (data ?? []) as RawOrderItem[];
      const incoming: OrderItemRow[] = incomingRaw.map((r) => ({
        id: r.id,
        order_id: r.order_id,
        product_id: r.product_id,
        name_snapshot: r.name_snapshot ?? "",
        qty: Number(r.qty ?? 0),
        unit_price_cents: Number(r.unit_price_cents ?? 0),
        line_total_cents: Number(r.line_total_cents ?? 0),
      }));

      setItems((prev) => {
        const prevArr = prev ?? [];
        const prevIds = new Set(prevArr.map((p) => p.id));
        return [...prevArr, ...incoming.filter((x) => !prevIds.has(x.id))];
      });
    }

    loadItemsForVisibleOrders();

    return () => {
      cancelled = true;
    };
  }, [mounted, supabase, filteredOrders, items]);

  async function handleUpdateStatus(orderId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o))
      );
    } catch (err: any) {
      console.error("Failed to update order status:", err);
      alert("Failed to update status: " + (err?.message ?? "Unknown error"));
    }
  }

  async function handleVerifyPayment(
    paymentId: string,
    orderId: string,
    paymentStatus: "paid" | "rejected"
  ) {
    try {
      const { error } = await supabase.rpc("admin_verify_payment", {
        p_payment_id: paymentId,
        p_status: paymentStatus,
      });

      if (error) throw error;

      const { data: updatedPayments } = await supabase
        .from("payments")
        .select("id, order_id, method, amount_cents, balance_due_cents, reference_number, gcash_ref, proof_url, status, paid_at, created_at")
        .eq("order_id", orderId);

      if (updatedPayments) {
        setPayments((prev) => {
          const filtered = prev.filter((p) => p.order_id !== orderId);
          return [...filtered, ...(updatedPayments as PaymentRow[])];
        });
      }

      const orderCode = orders.find((o) => o.id === orderId)?.order_code ?? orderId.slice(0, 8);
      alert(`Payment for Order ${orderCode} verified as ${paymentStatus.toUpperCase()}!`);
    } catch (err: any) {
      console.error("Failed to verify payment:", err);
      alert("Payment verification failed: " + (err?.message ?? "Unknown error"));
    }
  }

  async function handleQuickConfirm(order: OrderRow) {
    try {
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // NOTE: We intentionally do NOT auto-verify GCash payments here.
      // Receipt upload ≠ payment verification. Admin must manually verify
      // payments even when receipt is attached. This preserves financial truth.
      
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "confirmed", updated_at: new Date().toISOString() } : o))
      );

      // Refresh payments to ensure UI is in sync
      const { data: updatedPayments } = await supabase
        .from("payments")
        .select("id, order_id, method, amount_cents, balance_due_cents, reference_number, gcash_ref, proof_url, status, paid_at, created_at")
        .eq("order_id", order.id);

      if (updatedPayments) {
        setPayments((prev) => {
          const filtered = prev.filter((p) => p.order_id !== order.id);
          return [...filtered, ...(updatedPayments as PaymentRow[])];
        });
      }

      const orderCode = order.order_code ?? order.id.slice(0, 8);
      const payment = updatedPayments?.[0];
      const hasProof = payment?.proof_url;
      
      let message = `Order ${orderCode} confirmed!`;
      if (order.payment_method?.toLowerCase() === "gcash") {
        if (hasProof) {
          message += `\n\n📎 Receipt attached - verify payment when ready.`;
        } else {
          message += `\n\n⚠️ No receipt uploaded - ask customer for proof.`;
        }
      }
      alert(message);
    } catch (err: any) {
      console.error("Failed to confirm order:", err);
      alert("Confirmation failed: " + (err?.message ?? "Unknown error"));
    }
  }

  async function handleQuickStatusChange(orderId: string, newStatus: string) {
    await handleUpdateStatus(orderId, newStatus);
  }

  async function handleDeleteOrder(order: OrderRow) {
    const orderCode = order.order_code ?? order.id.slice(0, 8);

    if (
      !confirm(
        `⚠️ Delete order ${orderCode}?\n\nCustomer: ${order.customer_name}\nTotal: ${peso(
          order.total_cents ?? 0
        )}\n\nThis action cannot be undone!`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("orders").delete().eq("id", order.id);
      if (error) throw error;

      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setPayments((prev) => prev.filter((p) => p.order_id !== order.id));
      setItems((prev) => prev.filter((i) => i.order_id !== order.id));

      alert(`Order ${orderCode} deleted successfully.`);
    } catch (err: any) {
      console.error("Failed to delete order:", err);
      alert("Delete failed: " + (err?.message ?? "Unknown error"));
    }
  }

  // ============================================
  // CREDIT MODE HANDLERS (D2)
  // ============================================

  async function handleConvertToCredit(order: OrderRow) {
    const orderCode = order.order_code ?? order.id.slice(0, 8);
    const totalCents = order.total_cents ?? 0;

    if (
      !confirm(
        `💳 Convert Order ${orderCode} to CREDIT?\n\n` +
        `Customer: ${order.customer_name}\n` +
        `Amount: ${peso(totalCents)}\n\n` +
        `This will:\n` +
        `• Change payment method to CREDIT\n` +
        `• Set balance due to ${peso(totalCents)}\n` +
        `• Keep order status as "${order.status}"\n\n` +
        `The customer can pay later.`
      )
    ) {
      return;
    }

    try {
      // Get current payment
      const { data: currentPayment } = await supabase
        .from("payments")
        .select("id, amount_cents")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!currentPayment) {
        throw new Error("No payment record found for this order");
      }

      // Update payment to credit
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          method: "credit",
          status: "pending",
          balance_due_cents: currentPayment.amount_cents ?? totalCents,
          paid_at: null,
        })
        .eq("id", currentPayment.id);

      if (paymentError) throw paymentError;

      // Update order payment method
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          payment_method: "credit",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Refresh data
      const { data: updatedPayments } = await supabase
        .from("payments")
        .select("id, order_id, method, amount_cents, balance_due_cents, reference_number, gcash_ref, proof_url, status, paid_at, created_at")
        .eq("order_id", order.id);

      if (updatedPayments) {
        setPayments((prev) => {
          const filtered = prev.filter((p) => p.order_id !== order.id);
          return [...filtered, ...(updatedPayments as PaymentRow[])];
        });
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, payment_method: "credit" } : o))
      );

      alert(`✅ Order ${orderCode} converted to credit!\n\nBalance due: ${peso(totalCents)}`);
    } catch (err: any) {
      console.error("Failed to convert to credit:", err);
      alert("Credit conversion failed: " + (err?.message ?? "Unknown error"));
    }
  }

  async function handleRecordRepayment(order: OrderRow) {
    const orderCode = order.order_code ?? order.id.slice(0, 8);

    if (
      !confirm(
        `💰 Record FULL REPAYMENT for Order ${orderCode}?\n\n` +
        `Customer: ${order.customer_name}\n` +
        `Amount: ${peso(order.total_cents ?? 0)}\n\n` +
        `This will:\n` +
        `• Mark payment as PAID\n` +
        `• Clear balance due to ₱0\n` +
        `• Settle the credit order\n\n` +
        `Confirm cash was received.`
      )
    ) {
      return;
    }

    try {
      // Get current payment
      const { data: currentPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!currentPayment) {
        throw new Error("No payment record found");
      }

      // Update payment to settled
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          balance_due_cents: 0,
          paid_at: new Date().toISOString(),
        })
        .eq("id", currentPayment.id);

      if (paymentError) throw paymentError;

      // Refresh data
      const { data: updatedPayments } = await supabase
        .from("payments")
        .select("id, order_id, method, amount_cents, balance_due_cents, reference_number, gcash_ref, proof_url, status, paid_at, created_at")
        .eq("order_id", order.id);

      if (updatedPayments) {
        setPayments((prev) => {
          const filtered = prev.filter((p) => p.order_id !== order.id);
          return [...filtered, ...(updatedPayments as PaymentRow[])];
        });
      }

      alert(`✅ Repayment recorded!\n\nOrder ${orderCode} is now settled.`);
    } catch (err: any) {
      console.error("Failed to record repayment:", err);
      alert("Repayment recording failed: " + (err?.message ?? "Unknown error"));
    }
  }

  function pickupLabel(o: OrderRow): string {
    if (String(o.fulfillment) === "delivery") return o.delivery_location ?? "Not specified";
    return o.pickup_location ?? "Not specified";
  }

  function statusColor(status: string | null): string {
    switch (status) {
      case "confirmed":
      case "ready":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "preparing":
      case "out_for_delivery":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      case "pending":
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  }

  function creditStatusColor(payment: PaymentRow | undefined): string {
    if (!payment) return "";
    if (payment.method !== "credit") return "";
    
    // Credit with balance due = unpaid (purple/indigo)
    if ((payment.balance_due_cents ?? 0) > 0) {
      return "bg-purple-100 text-purple-700 border-purple-200";
    }
    // Credit settled = green
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  function statusIcon(status: string | null) {
    switch (status) {
      case "confirmed":
      case "ready":
        return <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
      case "preparing":
        return <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
      case "out_for_delivery":
        return <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
      case "cancelled":
        return <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
      case "pending":
      default:
        return <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
    }
  }

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white p-3 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900 sm:text-2xl lg:text-3xl">Orders</h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600">
              {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/credit-orders"
              className="hidden sm:flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-medium text-purple-700 transition hover:border-purple-700 hover:bg-purple-50"
            >
              <Wallet className="h-4 w-4" />
              Credit Orders
            </Link>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 sm:pl-10 pr-4 text-xs sm:text-sm transition focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
          {["all", "pending", "confirmed", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
                statusFilter === status
                  ? "border-amber-700 bg-amber-700 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-amber-700 hover:bg-amber-50"
              }`}
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 sm:p-8 text-center">
            <Package className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-stone-400" />
            <h3 className="mt-3 sm:mt-4 text-sm font-semibold text-stone-900">No orders found</h3>
            <p className="mt-1 text-xs sm:text-sm text-stone-500">{search ? "Try adjusting your search" : "Orders will appear here"}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => {
              const orderPayments = (payments ?? []).filter((p) => p.order_id === order.id);
              const latestPayment = [...orderPayments].sort((a, b) => (a.created_at > b.created_at ? -1 : 1))[0];
              const orderItems = (items ?? []).filter((item) => item.order_id === order.id);
              const isPaid = isPaymentSettled(latestPayment?.status, latestPayment?.paid_at);
              const creditBalanceDue = getCreditBalanceDue(latestPayment, order.total_cents ?? 0);
              const hasOutstandingCredit =
                latestPayment?.method === "credit" && creditBalanceDue > 0;
              const isCreditSettled =
                latestPayment?.method === "credit" && !hasOutstandingCredit;

              const getPrimaryButton = () => {
                if (order.status === "pending") {
                  return {
                    label: "✓ Confirm",
                    onClick: () => handleQuickConfirm(order),
                    className:
                      "flex-1 rounded-lg sm:rounded-xl bg-emerald-600 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]",
                  };
                } else if (order.status === "confirmed") {
                  return {
                    label: "✅ Confirmed",
                    onClick: null,
                    className:
                      "flex-1 rounded-lg sm:rounded-xl bg-stone-100 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-stone-600 cursor-default",
                  };
                }
                return null;
              };

              const getSecondaryButton = () => {
                if (order.status === "pending") {
                  return {
                    label: "✕ Cancel",
                    onClick: () => handleQuickStatusChange(order.id, "cancelled"),
                    className:
                      "rounded-lg sm:rounded-xl border-2 border-red-200 bg-white px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 active:scale-[0.98]",
                  };
                }
                return null;
              };

              const primaryBtn = getPrimaryButton();
              const secondaryBtn = getSecondaryButton();

              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-xl sm:rounded-2xl border border-stone-200 bg-white shadow-md transition hover:shadow-xl"
                >
                  {/* Card Header */}
                  <div className="border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white px-3 sm:px-5 py-3 sm:py-4">
                    <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-stone-500">Order</div>
                        <div className="mt-0.5 sm:mt-1 text-base sm:text-lg lg:text-xl font-bold text-stone-900 truncate">
                          {order.order_code ?? order.id.slice(0, 8)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className={`flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap ${statusColor(order.status)}`}>
                          {statusIcon(order.status)}
                          <span className="hidden xs:inline">{(order.status ?? "pending").replace("_", " ")}</span>
                        </div>
                        {/* Proof Submitted Badge */}
                        {latestPayment?.proof_url && !isPaid && latestPayment?.method !== 'credit' && (
                          <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            <span>📎</span>
                            <span>Proof Submitted</span>
                          </div>
                        )}
                        {/* Credit Badge */}
                        {hasOutstandingCredit && (
                          <div className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            <span>💳</span>
                            <span>Credit</span>
                          </div>
                        )}
                        {isCreditSettled && (
                          <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <span>✓</span>
                            <span>Paid</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <span className="font-semibold text-stone-900 truncate">{order.customer_name ?? "—"}</span>
                      <span className="text-stone-300">•</span>
                      <span className="text-xs sm:text-sm text-stone-500 whitespace-nowrap">{time(order.created_at).split(" ")[1]}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 sm:p-5">
                    {/* Items Section */}
                    <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl border-2 border-stone-300 bg-stone-50 p-3 sm:p-4">
                      <div className="mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-stone-900">
                        <span className="text-sm sm:text-base">📦</span>
                        <span>Items ({orderItems.length})</span>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                        {orderItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                            <span className="text-stone-700 truncate flex-1 min-w-0">
                              <span className="font-bold text-stone-900">{item.qty}×</span>{" "}
                              {item.name_snapshot || "Unknown item"}
                            </span>
                            <span className="font-semibold text-stone-900 whitespace-nowrap text-xs sm:text-sm">
                              {peso(
                                (item.line_total_cents ?? 0) > 0
                                  ? item.line_total_cents
                                  : (item.unit_price_cents ?? 0) * (item.qty ?? 0)
                              )}
                            </span>
                          </div>
                        ))}

                        {orderItems.length === 0 && <div className="text-xs sm:text-sm italic text-stone-500 py-2">No items found</div>}
                      </div>

                      <div className="mt-2 sm:mt-3 flex items-center justify-between border-t-2 border-stone-300 pt-2 sm:pt-3 text-sm sm:text-base font-semibold text-stone-900">
                        <span>Subtotal:</span>
                        <span className="text-sm sm:text-base">{peso(order.subtotal_cents ?? 0)}</span>
                      </div>
                    </div>

                    {/* Payment Info */}
                    {latestPayment && (
                      <div className={`mb-3 sm:mb-4 rounded-lg sm:rounded-xl border p-3 sm:p-4 ${
                        hasOutstandingCredit
                          ? 'border-purple-200 bg-purple-50/30' 
                          : latestPayment.proof_url && !isPaid 
                            ? 'border-blue-200 bg-blue-50/30' 
                            : 'border-stone-200 bg-white'
                      }`}>
                        <div className="mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-stone-900">
                          <span className="text-sm sm:text-base">💳</span>
                          <span>Payment</span>
                          <div className="ml-auto flex items-center gap-1">
                            {/* Credit Badge */}
                            {hasOutstandingCredit && (
                              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 flex items-center gap-1">
                                <span>💳</span>
                                <span>CREDIT - Unpaid</span>
                              </span>
                            )}
                            {isCreditSettled && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 flex items-center gap-1">
                                <span>✓</span>
                                <span>Credit Settled</span>
                              </span>
                            )}
                            {/* Proof Submitted Indicator */}
                            {latestPayment.proof_url && !isPaid && latestPayment.method !== 'credit' && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 flex items-center gap-1">
                                <span>📎</span>
                                <span>Proof Submitted</span>
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-xs ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {latestPayment.status ?? "pending"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-stone-600">Method:</span>
                            <span className={`font-medium uppercase ${latestPayment.method === 'credit' ? 'text-purple-700' : 'text-stone-900'}`}>
                              {latestPayment.method ?? "—"}
                            </span>
                          </div>
                          {latestPayment.method === 'credit' && (
                            <div className="flex justify-between">
                              <span className="text-stone-600">Balance Due:</span>
                              <span className={`font-bold ${creditBalanceDue > 0 ? 'text-purple-700' : 'text-emerald-600'}`}>
                                {peso(creditBalanceDue)}
                              </span>
                            </div>
                          )}
                          {latestPayment.gcash_ref && (
                            <div className="flex justify-between">
                              <span className="text-stone-600">Reference:</span>
                              <span className="font-medium text-stone-900 font-mono">{latestPayment.gcash_ref}</span>
                            </div>
                          )}
                          {latestPayment.reference_number && (
                            <div className="flex justify-between">
                              <span className="text-stone-600">Ref #:</span>
                              <span className="font-medium text-stone-900 font-mono">{latestPayment.reference_number}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-stone-600">Amount:</span>
                            <span className="font-medium text-stone-900">{peso(latestPayment.amount_cents ?? 0)}</span>
                          </div>
                        </div>

                        {/* Receipt Image */}
                        {latestPayment.proof_url && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="text-xs font-medium text-stone-700">Customer Receipt:</div>
                              {!isPaid && (
                                <span className="text-xs text-blue-600 font-medium">Awaiting Verification</span>
                              )}
                            </div>
                            <a 
                              href={latestPayment.proof_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block rounded-lg border border-stone-200 overflow-hidden hover:border-amber-500 transition-colors"
                            >
                              <img 
                                src={latestPayment.proof_url} 
                                alt="Payment receipt" 
                                className="w-full h-24 sm:h-32 object-cover"
                              />
                              <div className="bg-stone-50 px-2 py-1 text-xs text-center text-stone-600">
                                Click to view full size
                              </div>
                            </a>
                            {!isPaid && (
                              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5">
                                <p className="text-xs text-amber-800">
                                  <span className="font-semibold">Action Required:</span> Review receipt and verify payment status below.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Payment Actions for GCash */}
                        {!isPaid && latestPayment.method?.toLowerCase() === "gcash" && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-stone-600 font-medium">Verify Payment:</div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Verify payment for Order ${order.order_code ?? order.id.slice(0, 8)} as PAID?\n\nThis confirms the GCash payment was received.`)) {
                                    handleVerifyPayment(latestPayment.id, order.id, "paid");
                                  }
                                }}
                                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                              >
                                ✓ Confirm Paid
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Reject payment for Order ${order.order_code ?? order.id.slice(0, 8)}?\n\nUse this if the receipt is invalid or payment not found.`)) {
                                    handleVerifyPayment(latestPayment.id, order.id, "rejected");
                                  }
                                }}
                                className="rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Credit Actions */}
                        {latestPayment.method?.toLowerCase() === "credit" && hasOutstandingCredit && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-purple-700 font-medium">Credit Action:</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordRepayment(order);
                              }}
                              className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                            >
                              💰 Record Full Repayment
                            </button>
                          </div>
                        )}

                        {/* Convert to Credit Option (for eligible orders) */}
                        {!isPaid && 
                         latestPayment.method?.toLowerCase() !== "credit" && 
                         order.status !== "cancelled" && (
                          <div className="mt-3 pt-3 border-t border-stone-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConvertToCredit(order);
                              }}
                              className="w-full rounded-lg border-2 border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition"
                            >
                              💳 Convert to Credit
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:gap-3">
                      {primaryBtn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            primaryBtn.onClick?.();
                          }}
                          className={primaryBtn.className}
                        >
                          {primaryBtn.label}
                        </button>
                      )}

                      {secondaryBtn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            secondaryBtn.onClick?.();
                          }}
                          className={secondaryBtn.className}
                        >
                          {secondaryBtn.label}
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(order);
                        }}
                        className="rounded-lg sm:rounded-xl border-2 border-stone-200 bg-white px-2.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 active:scale-[0.98]"
                        title="Delete order"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
