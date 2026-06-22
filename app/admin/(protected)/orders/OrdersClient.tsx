"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  Download,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  WalletCards,
  X,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { getCreditBalanceDue, isPaymentSettled } from "@/lib/payments";
import { AdminActionButton } from "../components/workflow/AdminActionButton";
import { AdminConfirmModal } from "../components/workflow/AdminConfirmModal";
import { AdminFilterBar } from "../components/workflow/AdminFilterBar";
import { AdminMetricCard } from "../components/workflow/AdminMetricCard";
import { AdminMetricRow } from "../components/workflow/AdminMetricRow";
import { AdminPageHeader } from "../components/workflow/AdminPageHeader";
import { AdminRightRail } from "../components/workflow/AdminRightRail";
import { AdminSectionCard } from "../components/workflow/AdminSectionCard";
import { AdminStatusBadge } from "../components/workflow/AdminStatusBadge";
import { AdminWorkflowPage } from "../components/workflow/AdminWorkflowPage";
import { AdminWorkflowTabs } from "../components/workflow/AdminWorkflowTabs";
import { formatCompactLocation } from "../components/workflow/compactFormatters";
import { OrderDetailDrawer } from "./components/OrderDetailDrawer";
import { OrderEditModal } from "./components/OrderEditModal";
import { OrdersCompactTable } from "./components/OrdersCompactTable";
import { PaymentBadge } from "./components/PaymentBadge";
import {
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
  formatTime,
  locationLabel,
  paymentMethodLabel,
  peso,
} from "./lib/labels";
import { getCompactItemsPreview } from "./lib/compactItems";

const ORDER_SELECT =
  "id, order_code, customer_name, contact, notes, fulfillment, pickup_location, delivery_fee_cents, delivery_location, payment_method, subtotal_cents, total_cents, status, created_at, updated_at";
const PAYMENT_SELECT =
  "id, order_id, method, amount_cents, balance_due_cents, reference_number, gcash_ref, proof_url, status, paid_at, created_at";
const ITEM_SELECT =
  "id, order_id, product_id, name_snapshot, unit_price_cents, line_total_cents, qty";

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
  updated_at: string | null;
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
  name_snapshot: string | null;
  unit_price_cents: number;
  line_total_cents: number;
  qty: number;
};

type OrderFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled"
  | "credit_unpaid"
  | "gcash_proof"
  | "unpaid";

type PaymentFilter = "all" | "gcash" | "cod" | "credit" | "unpaid" | "paid";
type FulfillmentFilter = "all" | "pickup" | "delivery";
type DateFilter = "all" | "today" | "7d";

type Toast = { id: string; message: string; tone?: "success" | "danger" };

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "success" | "warning";
  run: () => void | Promise<void>;
};

const FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "out_for_delivery", label: "Out for Delivery" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "gcash_proof", label: "GCash Proof" },
  { id: "unpaid", label: "Unpaid" },
  { id: "credit_unpaid", label: "Credit" },
];

const PAYMENT_OPTIONS: { label: string; value: PaymentFilter }[] = [
  { label: "All payment", value: "all" },
  { label: "GCash", value: "gcash" },
  { label: "COD / cash", value: "cod" },
  { label: "Credit", value: "credit" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Paid", value: "paid" },
];

const FULFILLMENT_OPTIONS: { label: string; value: FulfillmentFilter }[] = [
  { label: "All fulfillment", value: "all" },
  { label: "Pickup", value: "pickup" },
  { label: "Delivery", value: "delivery" },
];

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: "All dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
];

function getOrderCode(order: OrderRow) {
  return order.order_code ?? order.id.slice(0, 8);
}

function paymentMethod(payment?: PaymentRow, order?: OrderRow) {
  return String(payment?.method ?? order?.payment_method ?? "").toLowerCase();
}

function isCashLike(payment?: PaymentRow, order?: OrderRow) {
  const method = paymentMethod(payment, order);
  return method === "cash" || method === "cod";
}

function isCreditLike(payment?: PaymentRow, order?: OrderRow) {
  const method = paymentMethod(payment, order);
  return method === "credit" || method === "deposit";
}

function isToday(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isWithinLastDays(dateValue: string, days: number) {
  const created = new Date(dateValue).getTime();
  const boundary = Date.now() - days * 24 * 60 * 60 * 1000;

  return Number.isFinite(created) && created >= boundary;
}

function orderMatchesTab(
  order: OrderRow,
  payment: PaymentRow | undefined,
  tab: OrderFilter
) {
  if (tab === "all") return true;
  if (tab === "gcash_proof") {
    return paymentMethod(payment, order) === "gcash" && payment?.status !== "paid";
  }
  if (tab === "unpaid") {
    return !isPaymentSettled(payment?.status, payment?.paid_at);
  }
  if (tab === "credit_unpaid") {
    return isCreditLike(payment, order) && getCreditBalanceDue(payment, order.total_cents ?? 0) > 0;
  }

  return order.status === tab;
}

function statusTone(
  status: string | null | undefined
): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "completed" || status === "ready") return "success";
  if (status === "cancelled") return "danger";
  if (status === "out_for_delivery") return "info";
  if (status === "preparing" || status === "pending") return "warning";
  return "neutral";
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 min-w-[152px] rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-stone-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function csvValue(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
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
  const [orders, setOrders] = useState(initialOrders);
  const [payments, setPayments] = useState(initialPayments);
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [fulfillmentFilter, setFulfillmentFilter] =
    useState<FulfillmentFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialOrders[0]?.id ?? null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeAvailable, setRealtimeAvailable] = useState(true);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());

    setToasts((current) => [...current, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const refreshOrders = useCallback(async () => {
    setIsRefreshing(true);
    const supabase = supabaseBrowser();

    const [ordersResponse, paymentsResponse, itemsResponse] = await Promise.all([
      supabase
        .from("orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .order("created_at", { ascending: false }),
      supabase.from("order_items").select(ITEM_SELECT),
    ]);

    if (ordersResponse.error || paymentsResponse.error || itemsResponse.error) {
      pushToast({ message: "Unable to refresh orders.", tone: "danger" });
      setIsRefreshing(false);
      return;
    }

    setOrders((ordersResponse.data ?? []) as OrderRow[]);
    setPayments((paymentsResponse.data ?? []) as PaymentRow[]);
    setItems((itemsResponse.data ?? []) as OrderItemRow[]);
    setIsRefreshing(false);
  }, [pushToast]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("admin-orders-workflow")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => refreshOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => refreshOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => refreshOrders()
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeAvailable(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshOrders]);

  const latestPaymentByOrderId = useMemo(() => {
    const map = new Map<string, PaymentRow>();

    for (const payment of payments) {
      const current = map.get(payment.order_id);
      if (!current || payment.created_at > current.created_at) {
        map.set(payment.order_id, payment);
      }
    }

    return map;
  }, [payments]);

  const itemsByOrderId = useMemo(() => {
    const map = new Map<string, OrderItemRow[]>();

    for (const item of items) {
      const current = map.get(item.order_id) ?? [];
      current.push(item);
      map.set(item.order_id, current);
    }

    return map;
  }, [items]);

  const ordersByTab = useCallback(
    (tab: OrderFilter) =>
      orders.filter((order) =>
        orderMatchesTab(order, latestPaymentByOrderId.get(order.id), tab)
      ),
    [latestPaymentByOrderId, orders]
  );

  const filterCounts = useMemo(() => {
    return FILTERS.reduce<Record<OrderFilter, number>>((accumulator, filter) => {
      accumulator[filter.id] = ordersByTab(filter.id).length;
      return accumulator;
    }, {} as Record<OrderFilter, number>);
  }, [ordersByTab]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return ordersByTab(statusFilter).filter((order) => {
      const payment = latestPaymentByOrderId.get(order.id);
      const itemSummary = (itemsByOrderId.get(order.id) ?? [])
        .map((item) => item.name_snapshot)
        .join(" ");
      const haystack = [
        getOrderCode(order),
        order.customer_name,
        order.contact,
        order.status,
        itemSummary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;
      if (
        fulfillmentFilter !== "all" &&
        order.fulfillment !== fulfillmentFilter
      ) {
        return false;
      }
      if (dateFilter === "today" && !isToday(order.created_at)) return false;
      if (dateFilter === "7d" && !isWithinLastDays(order.created_at, 7)) {
        return false;
      }
      if (paymentFilter === "gcash") return paymentMethod(payment, order) === "gcash";
      if (paymentFilter === "cod") return isCashLike(payment, order);
      if (paymentFilter === "credit") return isCreditLike(payment, order);
      if (paymentFilter === "paid") return isPaymentSettled(payment?.status, payment?.paid_at);
      if (paymentFilter === "unpaid") return !isPaymentSettled(payment?.status, payment?.paid_at);

      return true;
    });
  }, [
    dateFilter,
    fulfillmentFilter,
    itemsByOrderId,
    latestPaymentByOrderId,
    ordersByTab,
    paymentFilter,
    search,
    statusFilter,
  ]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId(null);
      return;
    }

    if (
      !selectedOrderId ||
      !filteredOrders.some((order) => order.id === selectedOrderId)
    ) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, fulfillmentFilter, paymentFilter, search, statusFilter, rowsPerPage]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      pushToast({ message: error.message, tone: "danger" });
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
    pushToast({
      message: `Order marked ${STATUS_LABELS[status] ?? status}.`,
      tone: "success",
    });
  };

  const handleVerifyPayment = async (
    paymentId: string,
    orderId?: string,
    status: "paid" | "rejected" = "paid"
  ) => {
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("admin_verify_payment", {
      p_payment_id: paymentId,
      p_status: status,
    });

    if (error) {
      pushToast({ message: error.message, tone: "danger" });
      return;
    }

    setPayments((current) =>
      current.map((payment) =>
        payment.id === paymentId ? { ...payment, status } : payment
      )
    );
    pushToast({
      message: `Payment ${PAYMENT_STATUS_LABELS[status] ?? status}.`,
      tone: "success",
    });

    if (status === "paid" && orderId) {
      await handleUpdateStatus(orderId, "confirmed");
    }
  };

  const handleMarkPaymentPaid = async (paymentId: string, orderId?: string) => {
    const supabase = supabaseBrowser();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: now })
      .eq("id", paymentId);

    if (error) {
      pushToast({ message: error.message, tone: "danger" });
      return;
    }

    setPayments((current) =>
      current.map((payment) =>
        payment.id === paymentId
          ? { ...payment, status: "paid", paid_at: now }
          : payment
      )
    );
    pushToast({ message: "Payment marked paid.", tone: "success" });

    if (orderId) {
      await handleUpdateStatus(orderId, "confirmed");
    }
  };

  const handleRecordRepayment = async (order: OrderRow) => {
    const payment = latestPaymentByOrderId.get(order.id);
    const balance = getCreditBalanceDue(payment, order.total_cents ?? 0);

    if (balance <= 0) {
      pushToast({ message: "Credit balance is already settled.", tone: "success" });
      return;
    }

    const confirmed = window.confirm(
      `Record repayment for ${getOrderCode(order)}?\n\nBalance due: ${peso(
        balance
      )}\n\nThis will mark the payment as paid and clear the balance.`
    );

    if (!confirmed || !payment) return;

    const now = new Date().toISOString();
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", balance_due_cents: 0, paid_at: now })
      .eq("id", payment.id);

    if (error) {
      pushToast({ message: error.message, tone: "danger" });
      return;
    }

    setPayments((current) =>
      current.map((row) =>
        row.id === payment.id
          ? { ...row, status: "paid", balance_due_cents: 0, paid_at: now }
          : row
      )
    );
    pushToast({ message: "Credit repayment recorded.", tone: "success" });

    await handleUpdateStatus(order.id, "confirmed");
  };

  const handleDeleteOrder = async (order: OrderRow) => {
    if (!window.confirm("Delete this order? This cannot be undone.")) return;

    const supabase = supabaseBrowser();
    const { error } = await supabase.from("orders").delete().eq("id", order.id);

    if (error) {
      pushToast({ message: error.message, tone: "danger" });
      return;
    }

    setOrders((current) => current.filter((row) => row.id !== order.id));
    setPayments((current) => current.filter((payment) => payment.order_id !== order.id));
    setItems((current) => current.filter((item) => item.order_id !== order.id));
    pushToast({ message: "Order deleted.", tone: "success" });
  };

  const metrics = useMemo(() => {
    const openOrders = orders.filter(
      (order) =>
        !["completed", "cancelled", "delivered"].includes(
          order.status ?? "pending"
        )
    ).length;
    const pendingPayments = orders.filter(
      (order) => {
        const payment = latestPaymentByOrderId.get(order.id);
        return !isPaymentSettled(payment?.status, payment?.paid_at);
      }
    ).length;
    const gcashProof = orders.filter((order) => {
      const payment = latestPaymentByOrderId.get(order.id);
      return (
        paymentMethod(payment, order) === "gcash" &&
        !isPaymentSettled(payment?.status, payment?.paid_at) &&
        Boolean(payment?.proof_url)
      );
    }).length;
    const todayRevenue = orders
      .filter((order) => isToday(order.created_at) && order.status !== "cancelled")
      .reduce((sum, order) => sum + (order.total_cents ?? 0), 0);
    const creditOrders = orders.filter((order) => {
      const payment = latestPaymentByOrderId.get(order.id);
      return (
        isCreditLike(payment, order) &&
        getCreditBalanceDue(payment, order.total_cents ?? 0) > 0
      );
    }).length;

    return {
      openOrders,
      pendingPayments,
      gcashProof,
      todayRevenue,
      creditOrders,
    };
  }, [latestPaymentByOrderId, orders]);

  const activeOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ??
    filteredOrders[0] ??
    null;
  const activePayment = activeOrder
    ? latestPaymentByOrderId.get(activeOrder.id)
    : undefined;
  const activeItems = activeOrder ? itemsByOrderId.get(activeOrder.id) ?? [] : [];
  const editOrder = editOrderId
    ? orders.find((order) => order.id === editOrderId) ?? null
    : null;
  const editPayment = editOrder
    ? latestPaymentByOrderId.get(editOrder.id)
    : undefined;
  const editItems = editOrder ? itemsByOrderId.get(editOrder.id) ?? [] : [];
  const paymentNeedsAction =
    activePayment && !isPaymentSettled(activePayment.status, activePayment.paid_at);
  const activePaymentMethod = activeOrder
    ? paymentMethod(activePayment, activeOrder)
    : "";
  const activeFullLocation = activeOrder
    ? locationLabel(activeOrder.delivery_location || activeOrder.pickup_location)
    : "";
  const activeCompactLocation = formatCompactLocation(activeFullLocation);
  const activeItemsPreview = getCompactItemsPreview(activeItems);
  const activePendingGcashPayment =
    activePaymentMethod === "gcash" &&
    !isPaymentSettled(activePayment?.status, activePayment?.paid_at);
  const canConfirmActiveOrder =
    activeOrder?.status === "pending" && !activePendingGcashPayment;
  const terminalStatus =
    activeOrder?.status === "completed" || activeOrder?.status === "cancelled";

  const askToRun = (action: ConfirmAction) => setConfirmAction(action);

  const handleConfirmAction = async () => {
    const action = confirmAction;
    if (!action) return;

    await action.run();
    setConfirmAction(null);
  };

  const openOrderOnSmallScreen = (order: OrderRow) => {
    setSelectedOrderId(order.id);
    if (window.innerWidth < 1280) {
      setDetailOpen(true);
    }
  };

  const openOrderDetails = (order: OrderRow) => {
    setSelectedOrderId(order.id);
    setDetailOpen(true);
  };

  const openOrderEditor = (order: OrderRow) => {
    setSelectedOrderId(order.id);
    setEditOrderId(order.id);
  };

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginatedOrders = filteredOrders.slice(pageStart, pageStart + rowsPerPage);
  const rangeStart = filteredOrders.length ? pageStart + 1 : 0;
  const rangeEnd = Math.min(pageStart + rowsPerPage, filteredOrders.length);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const handleExport = () => {
    const header = [
      "Order Code",
      "Customer",
      "Contact",
      "Location",
      "Items",
      "Total",
      "Payment Method",
      "Payment Status",
      "Order Status",
      "Created",
    ];
    const rows = filteredOrders.map((order) => {
      const payment = latestPaymentByOrderId.get(order.id);
      const orderItems = itemsByOrderId.get(order.id) ?? [];
      const location = locationLabel(order.delivery_location || order.pickup_location);
      const itemSummary = orderItems
        .filter((item) => item.qty > 0)
        .map((item) => `${item.qty} x ${item.name_snapshot ?? "Item"}`)
        .join("; ");

      return [
        getOrderCode(order),
        order.customer_name,
        order.contact,
        location,
        itemSummary,
        peso(order.total_cents),
        paymentMethod(payment, order),
        payment?.status ?? "pending",
        order.status ?? "pending",
        order.created_at,
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((value) => csvValue(value)).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminWorkflowPage
      header={
        <AdminPageHeader
          eyebrow="Commerce"
          title="Orders"
          description="Track, confirm, prepare, deliver, and close customer orders."
          actions={
            <>
              <Link
                href="/checkout"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white shadow-sm shadow-amber-900/15 transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                New Order
              </Link>
              <AdminActionButton
                variant="secondary"
                icon={<RefreshCw className={isRefreshing ? "animate-spin" : ""} />}
                onClick={refreshOrders}
                disabled={isRefreshing}
              >
                Refresh
              </AdminActionButton>
              <AdminActionButton
                variant="secondary"
                icon={<Download />}
                onClick={handleExport}
              >
                Export
              </AdminActionButton>
            </>
          }
        />
      }
      metrics={
        <AdminMetricRow>
          <AdminMetricCard
            label="Open Orders"
            value={String(metrics.openOrders)}
            helper={`${filterCounts.pending ?? 0} pending`}
            icon={<ShoppingCart />}
          />
          <AdminMetricCard
            label="Pending Payment"
            value={String(metrics.pendingPayments)}
            helper="Awaiting payment"
            icon={<CreditCard />}
          />
          <AdminMetricCard
            label="GCash Proof"
            value={String(metrics.gcashProof)}
            helper="Awaiting review"
            tone="info"
            icon={<ReceiptText />}
          />
          <AdminMetricCard
            label="Credit Unpaid"
            value={String(metrics.creditOrders)}
            helper="Balance outstanding"
            tone="danger"
            icon={<Banknote />}
          />
          <AdminMetricCard
            label="Today Revenue"
            value={peso(metrics.todayRevenue)}
            helper="Non-cancelled orders"
            tone="success"
            icon={<WalletCards />}
          />
        </AdminMetricRow>
      }
      main={
        <div className="space-y-4">
          <AdminSectionCard className="overflow-hidden p-0">
            <AdminWorkflowTabs
              tabs={FILTERS.map((filter) => ({
                value: filter.id,
                label: filter.label,
                count: filterCounts[filter.id] ?? 0,
              }))}
              activeValue={statusFilter}
              onChange={(value) => setStatusFilter(value as OrderFilter)}
            />
            <div className="border-t border-stone-100 p-3">
              <AdminFilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search order #, customer, phone..."
                filters={
                  <>
                    <FilterSelect
                      label="Date"
                      value={dateFilter}
                      options={DATE_OPTIONS}
                      onChange={setDateFilter}
                    />
                    <FilterSelect
                      label="Payment"
                      value={paymentFilter}
                      options={PAYMENT_OPTIONS}
                      onChange={setPaymentFilter}
                    />
                    <FilterSelect
                      label="Fulfillment"
                      value={fulfillmentFilter}
                      options={FULFILLMENT_OPTIONS}
                      onChange={setFulfillmentFilter}
                    />
                  </>
                }
                actions={
                  <div className="relative">
                    <AdminActionButton
                      type="button"
                      variant="ghost"
                      icon={<SlidersHorizontal />}
                      onClick={() => setFilterMenuOpen((open) => !open)}
                    >
                      More Filters
                    </AdminActionButton>
                    {filterMenuOpen ? (
                      <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-sm shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left font-semibold text-stone-700 hover:bg-stone-50"
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("all");
                            setPaymentFilter("all");
                            setFulfillmentFilter("all");
                            setDateFilter("all");
                            setFilterMenuOpen(false);
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : null}
                  </div>
                }
              />
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            className="p-0"
            footer={
              <div className="flex flex-col gap-3 text-xs font-medium text-stone-500 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    Rows per page:
                    <select
                      value={rowsPerPage}
                      onChange={(event) => setRowsPerPage(Number(event.target.value))}
                      className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-sm font-semibold text-stone-800"
                    >
                      {[25, 50, 100].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!realtimeAvailable ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                      Realtime paused, use refresh
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    {rangeStart}-{rangeEnd} of {filteredOrders.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={currentPage <= 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-amber-50 px-2 font-bold text-amber-800">
                      {currentPage}
                    </span>
                    <span className="text-stone-400">/ {pageCount}</span>
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                      disabled={currentPage >= pageCount}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 disabled:opacity-40"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            }
          >
            <OrdersCompactTable
              orders={paginatedOrders}
              payments={payments}
              items={items}
              paymentByOrderId={latestPaymentByOrderId}
              itemsByOrderId={itemsByOrderId}
              selectedOrderId={activeOrder?.id ?? null}
              onSelectOrder={openOrderOnSmallScreen}
              onOpenDetails={openOrderDetails}
              onEditOrder={openOrderEditor}
              onUpdateStatus={handleUpdateStatus}
              onVerifyPayment={handleVerifyPayment}
              onMarkPaymentPaid={handleMarkPaymentPaid}
              onRecordRepayment={handleRecordRepayment}
              onDeleteOrder={handleDeleteOrder}
            />
          </AdminSectionCard>
        </div>
      }
      rightRail={
        <AdminRightRail
          title={
            activeOrder
              ? (
                  <p className="font-mono text-base font-bold text-stone-950">
                    {getOrderCode(activeOrder)}
                  </p>
                )
              : "Order Preview"
          }
          statusBadge={
            activeOrder ? (
              <AdminStatusBadge
                status={activeOrder.status}
                label={
                  STATUS_LABELS[activeOrder.status ?? "pending"] ??
                  activeOrder.status ??
                  "Pending"
                }
                tone={statusTone(activeOrder.status)}
              />
            ) : undefined
          }
          actions={
            activeOrder ? (
              <div className="grid grid-cols-2 gap-2">
                <AdminActionButton
                  type="button"
                  variant="secondary"
                  className="w-full px-2"
                  onClick={() => setDetailOpen(true)}
                >
                  View Details
                </AdminActionButton>
                <AdminActionButton
                  type="button"
                  variant="secondary"
                  className="w-full px-2"
                  onClick={() => setEditOrderId(activeOrder.id)}
                >
                  Edit Order
                </AdminActionButton>
              </div>
            ) : null
          }
        >
          {activeOrder ? (
            <div className="space-y-4">
              <section className="space-y-0.5">
                <p className="truncate text-sm font-bold text-stone-950">
                  {activeOrder.customer_name ?? "Customer"}
                </p>
                <p className="truncate text-sm text-stone-500">
                  {activeOrder.contact ?? "No contact"}
                </p>
              </section>

              <section className="space-y-2 border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span
                    title={activeFullLocation}
                    className="inline-flex min-w-0 items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700"
                  >
                    <span className="truncate">{activeCompactLocation}</span>
                  </span>
                  <span className="font-semibold text-stone-800">
                    {activeOrder.fulfillment === "delivery" ? "Delivery" : "Pickup"}
                  </span>
                </div>
                <p className="text-sm font-medium text-stone-500">
                  {formatTime(activeOrder.created_at)}
                </p>
              </section>

              <section className="space-y-2 border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-stone-600">Total</span>
                  <span className="text-base font-bold tabular-nums text-orange-700">
                    {peso(activeOrder.total_cents)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-stone-800">
                    {paymentMethodLabel(activePaymentMethod)}
                  </span>
                  <span className="shrink-0">
                    <PaymentBadge payment={activePayment} order={activeOrder} />
                  </span>
                </div>
                <div
                  title={activeItemsPreview.fullText}
                  className="line-clamp-2 text-sm leading-5 text-stone-600"
                >
                  <span className="font-semibold text-stone-800">
                    {activeItems.length} {activeItems.length === 1 ? "item" : "items"}
                  </span>
                  {" • "}
                  {activeItemsPreview.primary}
                  {activeItemsPreview.additionalCount > 0
                    ? ` +${activeItemsPreview.additionalCount} more`
                    : ""}
                </div>
              </section>

              <section className="space-y-2 border-t border-stone-100 pt-4">
                {paymentNeedsAction && activePayment && activePaymentMethod === "gcash" ? (
                  <AdminActionButton
                    type="button"
                    variant="primary"
                    className="w-full"
                    icon={<CheckCircle2 />}
                    onClick={() =>
                      askToRun({
                        title: "Confirm payment",
                        description: `Mark ${getOrderCode(activeOrder)} GCash payment as paid?`,
                        confirmLabel: "Confirm Payment",
                        tone: "success",
                        run: () =>
                          handleVerifyPayment(
                            activePayment.id,
                            activeOrder.id,
                            "paid"
                          ),
                      })
                    }
                  >
                    Confirm Payment
                  </AdminActionButton>
                ) : null}

                {paymentNeedsAction && activePayment && isCashLike(activePayment, activeOrder) ? (
                  <AdminActionButton
                    type="button"
                    variant="primary"
                    className="w-full"
                    icon={<CheckCircle2 />}
                    onClick={() =>
                      askToRun({
                        title: "Mark payment paid",
                        description: `Mark ${getOrderCode(activeOrder)} cash payment as paid?`,
                        confirmLabel: "Mark Paid",
                        tone: "success",
                        run: () =>
                          handleMarkPaymentPaid(activePayment.id, activeOrder.id),
                      })
                    }
                  >
                    Confirm Payment
                  </AdminActionButton>
                ) : null}

                {paymentNeedsAction && activePayment && isCreditLike(activePayment, activeOrder) ? (
                  <AdminActionButton
                    type="button"
                    variant="primary"
                    className="w-full"
                    icon={<Banknote />}
                    onClick={() => handleRecordRepayment(activeOrder)}
                  >
                    Record Repayment
                  </AdminActionButton>
                ) : null}

                {activeOrder.status === "pending" && activePendingGcashPayment ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    Confirm payment first.
                  </div>
                ) : null}

                {canConfirmActiveOrder ? (
                  <AdminActionButton
                    type="button"
                    variant="primary"
                    className="w-full"
                    onClick={() => handleUpdateStatus(activeOrder.id, "confirmed")}
                  >
                    Confirm Order
                  </AdminActionButton>
                ) : null}

                {!terminalStatus && activeOrder.status === "confirmed" ? (
                  <AdminActionButton
                    type="button"
                    variant="primary"
                    className="w-full"
                    icon={<PackageCheck />}
                    onClick={() => handleUpdateStatus(activeOrder.id, "preparing")}
                  >
                    Mark Preparing
                  </AdminActionButton>
                ) : null}

                {!terminalStatus && activeOrder.status === "preparing" ? (
                  <AdminActionButton
                    type="button"
                    variant="primary"
                    className="w-full"
                    icon={<PackageCheck />}
                    onClick={() => handleUpdateStatus(activeOrder.id, "ready")}
                  >
                    Mark Ready
                  </AdminActionButton>
                ) : null}

                {!terminalStatus &&
                activeOrder.status === "ready" &&
                activeOrder.fulfillment === "delivery" ? (
                  <AdminActionButton
                    type="button"
                    variant="primary"
                    className="w-full"
                    icon={<Truck />}
                    onClick={() =>
                      handleUpdateStatus(activeOrder.id, "out_for_delivery")
                    }
                  >
                    Out for Delivery
                  </AdminActionButton>
                ) : null}

                {!terminalStatus &&
                (activeOrder.status === "out_for_delivery" ||
                  (activeOrder.status === "ready" &&
                    activeOrder.fulfillment !== "delivery")) ? (
                  <AdminActionButton
                    type="button"
                    variant="primary"
                    className="w-full"
                    onClick={() => handleUpdateStatus(activeOrder.id, "completed")}
                  >
                    Complete Order
                  </AdminActionButton>
                ) : null}

                {!terminalStatus && activeOrder.status !== "out_for_delivery" ? (
                  <details>
                    <summary className="flex h-9 cursor-pointer list-none items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 marker:hidden hover:bg-stone-50">
                      More Actions
                    </summary>
                    <div className="mt-2 rounded-xl border border-stone-200 bg-white p-2">
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                        onClick={() =>
                          askToRun({
                            title: "Cancel order",
                            description: `Cancel ${getOrderCode(activeOrder)}? This updates the order status only.`,
                            confirmLabel: "Cancel Order",
                            tone: "danger",
                            run: () =>
                              handleUpdateStatus(activeOrder.id, "cancelled"),
                          })
                        }
                      >
                        Cancel Order
                      </button>
                    </div>
                  </details>
                ) : null}
              </section>
            </div>
          ) : null}
        </AdminRightRail>
      }
      modals={
        <>
          <OrderDetailDrawer
            open={detailOpen}
            order={activeOrder}
            payment={activePayment}
            items={activeItems}
            onClose={() => setDetailOpen(false)}
            onUpdateStatus={handleUpdateStatus}
            onVerifyPayment={handleVerifyPayment}
            onMarkPaymentPaid={handleMarkPaymentPaid}
            onRecordRepayment={handleRecordRepayment}
            onDeleteOrder={handleDeleteOrder}
          />
          <OrderEditModal
            open={Boolean(editOrder)}
            order={editOrder}
            payment={editPayment}
            items={editItems}
            onClose={() => setEditOrderId(null)}
            onUpdateStatus={handleUpdateStatus}
            onVerifyPayment={handleVerifyPayment}
            onMarkPaymentPaid={handleMarkPaymentPaid}
            onRecordRepayment={handleRecordRepayment}
          />
          <AdminConfirmModal
            open={Boolean(confirmAction)}
            title={confirmAction?.title ?? ""}
            description={confirmAction?.description ?? ""}
            confirmLabel={confirmAction?.confirmLabel}
            tone={confirmAction?.tone}
            onClose={() => setConfirmAction(null)}
            onConfirm={handleConfirmAction}
          />
          <div className="fixed bottom-4 right-4 z-50 grid gap-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`flex min-w-[260px] items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${
                  toast.tone === "danger"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <span className="flex-1">{toast.message}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                  aria-label="Dismiss notification"
                  onClick={() =>
                    setToasts((current) =>
                      current.filter((item) => item.id !== toast.id)
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      }
    />
  );
}
