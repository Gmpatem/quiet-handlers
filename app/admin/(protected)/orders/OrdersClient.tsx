"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { getCreditBalanceDue, isPaymentSettled } from "@/lib/payments";
import { OrdersToolbar } from "./components/OrdersToolbar";
import { OrdersTable } from "./components/OrdersTable";

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

type Toast = { id: number; message: string; type: "info" | "success" | "warning" };

const ORDER_SELECT =
  "id, order_code, customer_name, contact, notes, fulfillment, pickup_location, delivery_fee_cents, delivery_location, payment_method, subtotal_cents, total_cents, status, created_at, updated_at";

const PAYMENT_SELECT =
  "id, order_id, method, amount_cents, balance_due_cents, reference_number, gcash_ref, proof_url, status, paid_at, created_at";

const ITEM_SELECT =
  "id, order_id, product_id, name_snapshot, unit_price_cents, line_total_cents, qty";

const FILTERS = [
  { id: "all", label: "All", tone: "stone" as const },
  { id: "pending", label: "New", tone: "amber" as const },
  { id: "confirmed", label: "Confirmed", tone: "emerald" as const },
  { id: "gcash_proof", label: "GCash Proof", tone: "blue" as const },
  { id: "unpaid", label: "Unpaid", tone: "red" as const },
  { id: "credit_unpaid", label: "Credit", tone: "purple" as const },
  { id: "cancelled", label: "Cancelled", tone: "stone" as const },
];

function normalizeItems(input: unknown[] | null | undefined): OrderItemRow[] {
  return (input ?? []).map((item: any) => ({
    id: String(item.id),
    order_id: String(item.order_id),
    product_id: item.product_id ?? null,
    name_snapshot: String(item.name_snapshot ?? ""),
    qty: Number(item.qty ?? 0),
    unit_price_cents: Number(item.unit_price_cents ?? 0),
    line_total_cents: Number(item.line_total_cents ?? 0),
  }));
}

function getLatestPayment(payments: PaymentRow[], orderId: string): PaymentRow | undefined {
  return [...payments.filter((payment) => payment.order_id === orderId)].sort((a, b) =>
    a.created_at > b.created_at ? -1 : 1
  )[0];
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
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders ?? []);
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments ?? []);
  const [items, setItems] = useState<OrderItemRow[]>(normalizeItems(initialItems));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeAvailable, setRealtimeAvailable] = useState(true);

  const toastCounterRef = useRef(0);
  const realtimeWarningShownRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => supabaseBrowser(), []);

  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++toastCounterRef.current;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const refreshAllData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setIsRefreshing(true);
      try {
        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select(ORDER_SELECT)
          .order("created_at", { ascending: false })
          .limit(200);
        if (orderError) throw orderError;

        const latestOrders = (orderRows ?? []) as OrderRow[];
        const orderIds = latestOrders.map((order) => order.id);

        let latestPayments: PaymentRow[] = [];
        let latestItems: OrderItemRow[] = [];

        if (orderIds.length > 0) {
          const [{ data: paymentRows, error: paymentError }, { data: itemRows, error: itemError }] =
            await Promise.all([
              supabase.from("payments").select(PAYMENT_SELECT).in("order_id", orderIds),
              supabase.from("order_items").select(ITEM_SELECT).in("order_id", orderIds),
            ]);

          if (paymentError) throw paymentError;
          if (itemError) throw itemError;

          latestPayments = (paymentRows ?? []) as PaymentRow[];
          latestItems = normalizeItems(itemRows as RawOrderItem[]);
        }

        setOrders(latestOrders);
        setPayments(latestPayments);
        setItems(latestItems);
      } catch (error: any) {
        console.error("Failed to refresh orders dashboard:", error);
        if (!silent) showToast("Unable to refresh orders.", "warning");
      } finally {
        setIsRefreshing(false);
      }
    },
    [showToast, supabase]
  );

  const scheduleRefresh = useCallback(
    (delayMs = 300) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        void refreshAllData({ silent: true });
      }, delayMs);
    },
    [refreshAllData]
  );

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-operations")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        showToast("New order received.", "success");
        scheduleRefresh(120);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        scheduleRefresh();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, () => {
        scheduleRefresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, () => {
        scheduleRefresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payments" }, () => {
        scheduleRefresh();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "payments" }, () => {
        scheduleRefresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" }, () => {
        scheduleRefresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_items" }, () => {
        scheduleRefresh();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "order_items" }, () => {
        scheduleRefresh();
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setRealtimeAvailable(true);
          realtimeWarningShownRef.current = false;
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeAvailable(false);
          if (!realtimeWarningShownRef.current) {
            showToast("Realtime offline. Refreshing every 20s.", "warning");
            realtimeWarningShownRef.current = true;
          }
        }
      });

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [scheduleRefresh, showToast, supabase]);

  useEffect(() => {
    if (realtimeAvailable) return;
    const interval = setInterval(() => {
      void refreshAllData({ silent: true });
    }, 20_000);
    return () => clearInterval(interval);
  }, [realtimeAvailable, refreshAllData]);

  const filteredOrders = useMemo(() => {
    let current = orders;
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      current = current.filter((order) => {
        const itemNames = items
          .filter((item) => item.order_id === order.id)
          .map((item) => item.name_snapshot.toLowerCase())
          .join(" ");
        return (
          (order.order_code ?? "").toLowerCase().includes(query) ||
          (order.customer_name ?? "").toLowerCase().includes(query) ||
          (order.contact ?? "").toLowerCase().includes(query) ||
          (order.id ?? "").toLowerCase().includes(query) ||
          itemNames.includes(query)
        );
      });
    }

    if (statusFilter === "gcash_proof") {
      current = current.filter((order) => {
        const payment = getLatestPayment(payments, order.id);
        return (
          (payment?.method ?? order.payment_method ?? "").toLowerCase() === "gcash" &&
          Boolean(payment?.proof_url) &&
          !isPaymentSettled(payment?.status, payment?.paid_at)
        );
      });
    } else if (statusFilter === "unpaid") {
      current = current.filter((order) => {
        const payment = getLatestPayment(payments, order.id);
        if (!payment) return true;
        return !isPaymentSettled(payment?.status, payment?.paid_at);
      });
    } else if (statusFilter === "credit_unpaid") {
      current = current.filter((order) => {
        const payment = getLatestPayment(payments, order.id);
        const method = (payment?.method ?? order.payment_method ?? "").toLowerCase();
        const isCreditLike = method === "credit" || method === "deposit";
        if (!isCreditLike) return false;
        const explicitBalance = getCreditBalanceDue(payment, order.total_cents ?? 0);
        return explicitBalance > 0 || !isPaymentSettled(payment?.status, payment?.paid_at);
      });
    } else if (statusFilter !== "all") {
      current = current.filter((order) => (order.status ?? "pending") === statusFilter);
    }
    return current;
  }, [items, orders, payments, search, statusFilter]);

  // Compute counts for each filter pill
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of FILTERS) {
      let current = [...orders];
      if (f.id === "gcash_proof") {
        current = current.filter((order) => {
          const payment = getLatestPayment(payments, order.id);
          return (
            (payment?.method ?? order.payment_method ?? "").toLowerCase() === "gcash" &&
            Boolean(payment?.proof_url) &&
            !isPaymentSettled(payment?.status, payment?.paid_at)
          );
        });
      } else if (f.id === "unpaid") {
        current = current.filter((order) => {
          const payment = getLatestPayment(payments, order.id);
          if (!payment) return true;
          return !isPaymentSettled(payment?.status, payment?.paid_at);
        });
      } else if (f.id === "credit_unpaid") {
        current = current.filter((order) => {
          const payment = getLatestPayment(payments, order.id);
          const method = (payment?.method ?? order.payment_method ?? "").toLowerCase();
          const isCreditLike = method === "credit" || method === "deposit";
          if (!isCreditLike) return false;
          const explicitBalance = getCreditBalanceDue(payment, order.total_cents ?? 0);
          return explicitBalance > 0 || !isPaymentSettled(payment?.status, payment?.paid_at);
        });
      } else if (f.id !== "all") {
        current = current.filter((order) => (order.status ?? "pending") === f.id);
      }
      counts[f.id] = current.length;
    }
    return counts;
  }, [orders, payments]);

  async function handleUpdateStatus(orderId: string, newStatus: string) {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: now })
        .eq("id", orderId);
      if (error) throw error;
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: newStatus, updated_at: now } : order
        )
      );
    } catch (error: any) {
      console.error("Failed to update order status:", error);
      alert("Failed to update order status: " + (error?.message ?? "Unknown error"));
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
      const { data: paymentRows, error: paymentError } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("order_id", orderId);
      if (paymentError) throw paymentError;
      setPayments((current) => {
        const withoutOrder = current.filter((payment) => payment.order_id !== orderId);
        return [...withoutOrder, ...((paymentRows ?? []) as PaymentRow[])];
      });
    } catch (error: any) {
      console.error("Failed to verify payment:", error);
      alert("Payment update failed: " + (error?.message ?? "Unknown error"));
    }
  }

  async function handleMarkPaymentPaid(paymentId: string, orderId: string) {
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          balance_due_cents: 0,
          paid_at: new Date().toISOString(),
        })
        .eq("id", paymentId);
      if (error) throw error;
      const { data: paymentRows, error: paymentRowsError } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("order_id", orderId);
      if (paymentRowsError) throw paymentRowsError;
      setPayments((current) => {
        const withoutOrder = current.filter((payment) => payment.order_id !== orderId);
        return [...withoutOrder, ...((paymentRows ?? []) as PaymentRow[])];
      });
    } catch (error: any) {
      console.error("Failed to mark payment as paid:", error);
      alert("Failed to mark payment as paid: " + (error?.message ?? "Unknown error"));
    }
  }

  async function handleRecordRepayment(order: OrderRow) {
    const orderCode = order.order_code ?? order.id.slice(0, 8);
    const confirmed = confirm(
      `Record full payment for Order ${orderCode}?\n\nConfirm payment was received before continuing.`
    );
    if (!confirmed) return;
    try {
      const { data: currentPayment, error: currentPaymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (currentPaymentError) throw currentPaymentError;
      if (!currentPayment) throw new Error("No payment record found");
      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({ status: "paid", balance_due_cents: 0, paid_at: new Date().toISOString() })
        .eq("id", currentPayment.id);
      if (paymentUpdateError) throw paymentUpdateError;
      const { data: paymentRows, error: paymentRowsError } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("order_id", order.id);
      if (paymentRowsError) throw paymentRowsError;
      setPayments((current) => {
        const withoutOrder = current.filter((payment) => payment.order_id !== order.id);
        return [...withoutOrder, ...((paymentRows ?? []) as PaymentRow[])];
      });
      showToast(`Order ${orderCode} marked as paid.`, "success");
    } catch (error: any) {
      console.error("Failed to record repayment:", error);
      alert("Failed to record payment: " + (error?.message ?? "Unknown error"));
    }
  }

  async function handleDeleteOrder(order: OrderRow) {
    const orderCode = order.order_code ?? order.id.slice(0, 8);
    const confirmed = confirm(`Delete Order ${orderCode}?\n\nThis action cannot be undone.`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", order.id);
      if (error) throw error;
      setOrders((current) => current.filter((row) => row.id !== order.id));
      setPayments((current) => current.filter((payment) => payment.order_id !== order.id));
      setItems((current) => current.filter((item) => item.order_id !== order.id));
      showToast(`Order ${orderCode} deleted.`, "warning");
    } catch (error: any) {
      console.error("Failed to delete order:", error);
      alert("Delete failed: " + (error?.message ?? "Unknown error"));
    }
  }

  const badgeBg = (active: boolean, tone: string) => {
    if (!active) return "bg-stone-200/70 text-stone-500";
    const map: Record<string, string> = {
      amber: "bg-amber-500 text-white",
      emerald: "bg-emerald-500 text-white",
      blue: "bg-blue-500 text-white",
      red: "bg-red-500 text-white",
      purple: "bg-purple-500 text-white",
      stone: "bg-stone-500 text-white",
    };
    return map[tone] ?? map.stone;
  };

  const pillBorder = (active: boolean, tone: string) => {
    if (!active) return "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50";
    const map: Record<string, string> = {
      amber: "border-amber-500 bg-amber-50 text-amber-800",
      emerald: "border-emerald-500 bg-emerald-50 text-emerald-800",
      blue: "border-blue-500 bg-blue-50 text-blue-800",
      red: "border-red-500 bg-red-50 text-red-800",
      purple: "border-purple-500 bg-purple-50 text-purple-800",
      stone: "border-stone-500 bg-stone-50 text-stone-800",
    };
    return map[tone] ?? map.stone;
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col -mb-6 gap-2">
      <OrdersToolbar
        search={search}
        onSearchChange={setSearch}
        onRefresh={() => refreshAllData({ silent: false })}
        isRefreshing={isRefreshing}
        totalCount={orders.length}
        shownCount={filteredOrders.length}
      />

      {/* Filter pills with counts */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {FILTERS.map((filter) => {
          const active = statusFilter === filter.id;
          const count = filterCounts[filter.id] ?? 0;
          return (
            <button
              type="button"
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition ${pillBorder(active, filter.tone)}`}
            >
              {filter.label}
              <span className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded px-1 text-[9px] font-bold ${badgeBg(active, filter.tone)}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table fills remaining space */}
      <div className="min-h-0 flex-1 overflow-auto">
        <OrdersTable
          orders={filteredOrders}
          payments={payments}
          items={items}
          onUpdateStatus={handleUpdateStatus}
          onVerifyPayment={handleVerifyPayment}
          onMarkPaymentPaid={handleMarkPaymentPaid}
          onRecordRepayment={handleRecordRepayment}
          onDeleteOrder={handleDeleteOrder}
        />
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-700"
                : toast.type === "warning"
                  ? "bg-amber-700"
                  : "bg-stone-800"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() =>
                setToasts((current) => current.filter((entry) => entry.id !== toast.id))
              }
              className="rounded p-0.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
