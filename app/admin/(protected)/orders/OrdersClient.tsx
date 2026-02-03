"use client";

import { useState, useEffect, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Search, Package, Clock, CheckCircle, XCircle, Truck, AlertCircle } from "lucide-react";

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
  reference_number: string | null;
  status: string | null;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  qty: number;
  price_at_order_cents: number;
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
  const [items, setItems] = useState<OrderItemRow[]>(initialItems ?? []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

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

  async function handleVerifyPayment(orderId: string, paymentStatus: string) {
    try {
      const { error } = await supabase.rpc("admin_verify_payment", {
        p_order_id: orderId,
        p_status: paymentStatus,
      });

      if (error) throw error;

      const { data: updatedPayments } = await supabase
        .from("payments")
        .select("id, order_id, method, amount_cents, reference_number, status, created_at")
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

      if (order.payment_method?.toLowerCase() === "gcash") {
        const { error: paymentError } = await supabase.rpc("admin_verify_payment", {
          p_order_id: order.id,
          p_status: "paid",
        });

        if (paymentError) throw paymentError;

        const { data: updatedPayments } = await supabase
          .from("payments")
          .select("id, order_id, method, amount_cents, reference_number, status, created_at")
          .eq("order_id", order.id);

        if (updatedPayments) {
          setPayments((prev) => {
            const filtered = prev.filter((p) => p.order_id !== order.id);
            return [...filtered, ...(updatedPayments as PaymentRow[])];
          });
        }
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "confirmed", updated_at: new Date().toISOString() } : o))
      );

      const paymentMsg = order.payment_method?.toLowerCase() === "gcash" ? " & payment verified" : "";
      alert(`Order ${order.order_code ?? order.id.slice(0, 8)} confirmed${paymentMsg}!`);
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
    
    if (!confirm(`⚠️ Delete order ${orderCode}?\n\nCustomer: ${order.customer_name}\nTotal: ${peso(order.total_cents ?? 0)}\n\nThis action cannot be undone!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

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

  function pickupLabel(o: OrderRow): string {
    if (String(o.fulfillment) === "delivery") {
      return o.delivery_location ?? "Not specified";
    }
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
            <p className="mt-1 text-xs sm:text-sm text-stone-500">
              {search ? "Try adjusting your search" : "Orders will appear here"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => {
              const orderPayments = (payments ?? []).filter((p) => p.order_id === order.id);
              const latestPayment = [...orderPayments].sort((a, b) => (a.created_at > b.created_at ? -1 : 1))[0];
              const orderItems = (items ?? []).filter((item) => item.order_id === order.id);
              const isPaid = latestPayment?.status === "paid";

              const getPrimaryButton = () => {
                if (order.status === "pending") {
                  return {
                    label: "✓ Confirm",
                    onClick: () => handleQuickConfirm(order),
                    className: "flex-1 rounded-lg sm:rounded-xl bg-emerald-600 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
                  };
                } else if (order.status === "confirmed") {
                  return {
                    label: "✅ Confirmed",
                    onClick: null,
                    className: "flex-1 rounded-lg sm:rounded-xl bg-stone-100 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-stone-600 cursor-default"
                  };
                }
                return null;
              };

              const getSecondaryButton = () => {
                if (order.status === "pending") {
                  return {
                    label: "✕ Cancel",
                    onClick: () => handleQuickStatusChange(order.id, "cancelled"),
                    className: "rounded-lg sm:rounded-xl border-2 border-red-200 bg-white px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 active:scale-[0.98]"
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
                      <div className={`flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap ${statusColor(order.status)}`}>
                        {statusIcon(order.status)}
                        <span className="hidden xs:inline">{(order.status ?? "pending").replace("_", " ")}</span>
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
                              {item.product_name ?? "Unknown"}
                            </span>
                            <span className="font-semibold text-stone-900 whitespace-nowrap text-xs sm:text-sm">
                              {peso((item.price_at_order_cents ?? 0) * (item.qty ?? 0))}
                            </span>
                          </div>
                        ))}
                        {orderItems.length === 0 && (
                          <div className="text-xs sm:text-sm italic text-stone-500 py-2">No items found</div>
                        )}
                      </div>
                      <div className="mt-2 sm:mt-3 flex items-center justify-between border-t-2 border-stone-300 pt-2 sm:pt-3 text-sm sm:text-base font-semibold text-stone-900">
                        <span>Subtotal:</span>
                        <span className="text-sm sm:text-base">{peso(order.subtotal_cents ?? 0)}</span>
                      </div>
                    </div>

                    {/* Location & Payment - Stacked on Mobile, Side by Side on Larger */}
                    <div className="mb-3 sm:mb-4 flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3">
                      {/* Location */}
                      <div className="rounded-lg sm:rounded-xl border border-amber-200 bg-amber-50 p-2.5 sm:p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-amber-900">
                          <span>📍</span>
                          <span>{String(order.fulfillment) === "delivery" ? "Delivery" : "Pickup"}</span>
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-amber-800 truncate">{pickupLabel(order)}</div>
                        {String(order.fulfillment) === "delivery" && order.delivery_fee_cents && order.delivery_fee_cents > 0 && (
                          <div className="mt-1 text-[10px] sm:text-xs text-amber-700">Fee: {peso(order.delivery_fee_cents)}</div>
                        )}
                      </div>

                      {/* Payment */}
                      <div className="rounded-lg sm:rounded-xl border border-stone-200 bg-white p-2.5 sm:p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-stone-600">
                          <span>💳</span>
                          <span>Payment</span>
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-stone-700 truncate">
                          {(order.payment_method ?? "").toUpperCase()}
                        </div>
                        <div className={`mt-0.5 sm:mt-1 text-sm sm:text-base font-bold ${isPaid ? "text-emerald-600" : "text-amber-700"}`}>
                          {isPaid ? "PAID ✓" : "UNPAID"}
                        </div>
                        
                        {/* Payment Buttons for Confirmed Cash Orders */}
                        {order.status === "confirmed" && !isPaid && (
                          <div className="mt-2 flex gap-1.5 sm:gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerifyPayment(order.id, "paid");
                              }}
                              className="flex-1 rounded-md sm:rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] sm:text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              ✓ Paid
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerifyPayment(order.id, "failed");
                              }}
                              className="flex-1 rounded-md sm:rounded-lg border border-red-300 bg-white px-2 py-1.5 text-[10px] sm:text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              ✕ Failed
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-3 sm:p-4 text-center">
                      <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-amber-900">Total</div>
                      <div className="mt-0.5 sm:mt-1 text-xl sm:text-2xl lg:text-3xl font-bold text-amber-900">{peso(order.total_cents ?? 0)}</div>
                    </div>

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
                      
                      {/* Delete Button */}
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