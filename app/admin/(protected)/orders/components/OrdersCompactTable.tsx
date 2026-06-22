"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Eye, MapPin, MoreVertical, Package, Pencil } from "lucide-react";
import { getCreditBalanceDue, isPaymentSettled } from "@/lib/payments";
import { formatCompactLocation } from "../../components/workflow/compactFormatters";
import type { OrderItemRow, OrderRow, PaymentRow } from "../OrdersClient";
import { locationLabel, peso, timeAgo } from "../lib/labels";
import { getCompactItemsPreview } from "../lib/compactItems";
import { MobileOrderActions } from "./MobileOrderActions";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentBadge } from "./PaymentBadge";
import { PaymentTypeBadge } from "./PaymentTypeBadge";

interface Props {
  orders: OrderRow[];
  payments: PaymentRow[];
  items: OrderItemRow[];
  paymentByOrderId?: ReadonlyMap<string, PaymentRow>;
  itemsByOrderId?: ReadonlyMap<string, OrderItemRow[]>;
  selectedOrderId?: string | null;
  onSelectOrder?: (order: OrderRow) => void;
  onOpenDetails?: (order: OrderRow) => void;
  onEditOrder?: (order: OrderRow) => void;
  onUpdateStatus: (orderId: string, status: string) => void | Promise<void>;
  onVerifyPayment: (
    paymentId: string,
    orderId: string,
    status: "paid" | "rejected"
  ) => void | Promise<void>;
  onMarkPaymentPaid: (paymentId: string, orderId: string) => void | Promise<void>;
  onRecordRepayment: (order: OrderRow) => void | Promise<void>;
  onDeleteOrder: (order: OrderRow) => void | Promise<void>;
}

const GRID_COLS =
  "32px minmax(142px,1fr) minmax(82px,0.48fr) minmax(150px,1.1fr) 74px 82px 80px 88px 104px";

function getLatestPayment(
  payments: PaymentRow[],
  orderId: string,
  paymentByOrderId?: ReadonlyMap<string, PaymentRow>
) {
  if (paymentByOrderId) return paymentByOrderId.get(orderId);
  return [...payments.filter((payment) => payment.order_id === orderId)].sort(
    (a, b) => (a.created_at > b.created_at ? -1 : 1)
  )[0];
}

function getOrderItems(
  items: OrderItemRow[],
  orderId: string,
  itemsByOrderId?: ReadonlyMap<string, OrderItemRow[]>
) {
  return itemsByOrderId?.get(orderId) ?? items.filter((item) => item.order_id === orderId);
}

function orderLocation(order: OrderRow) {
  if (order.delivery_location && order.delivery_location.trim().length > 0) {
    return locationLabel(order.delivery_location);
  }
  return locationLabel(order.pickup_location);
}

function rowAccent(order: OrderRow, payment: PaymentRow | undefined) {
  const status = order.status ?? "pending";
  const method = (payment?.method ?? order.payment_method ?? "").toLowerCase();
  const isPaid = isPaymentSettled(payment?.status, payment?.paid_at);
  const creditBalance = getCreditBalanceDue(payment, order.total_cents ?? 0);

  if (status === "cancelled" || status === "completed") return "border-l-transparent";
  if (method === "gcash" && !isPaid && payment?.proof_url) return "border-l-[3px] border-l-blue-400";
  if ((method === "credit" || method === "deposit") && creditBalance > 0) {
    return "border-l-[3px] border-l-purple-400";
  }
  if (status === "ready") return "border-l-[3px] border-l-emerald-400";
  if (status === "pending") return "border-l-[3px] border-l-amber-400";
  return "border-l-transparent";
}

function GridHeaderCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-center py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400 ${className}`}
    >
      {children}
    </div>
  );
}

function GridCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex min-w-0 items-center py-1.5 ${className}`}>{children}</div>;
}

function ItemsPreview({ items }: { items: OrderItemRow[] }) {
  const preview = getCompactItemsPreview(items);

  if (preview.primary === "No items") {
    return <span className="whitespace-nowrap text-sm text-stone-400">No items</span>;
  }

  return (
    <div
      title={preview.fullText}
      className="flex min-w-0 items-center whitespace-nowrap text-sm leading-5 text-stone-700"
    >
      <span className="min-w-0 truncate">{preview.primary}</span>
      {preview.additionalCount > 0 ? (
        <span className="ml-1 shrink-0 font-semibold text-stone-500">
          +{preview.additionalCount} more
        </span>
      ) : null}
    </div>
  );
}

function ActionIconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
    >
      {children}
    </button>
  );
}

function MoreMenu({
  order,
  payment,
  onOpenDetails,
  onUpdateStatus,
  onVerifyPayment,
  onDeleteOrder,
}: {
  order: OrderRow;
  payment: PaymentRow | undefined;
  onOpenDetails?: (order: OrderRow) => void;
  onUpdateStatus: (orderId: string, status: string) => void | Promise<void>;
  onVerifyPayment: (
    paymentId: string,
    orderId: string,
    status: "paid" | "rejected"
  ) => void | Promise<void>;
  onDeleteOrder: (order: OrderRow) => void | Promise<void>;
}) {
  const status = order.status ?? "pending";
  const isTerminal = status === "completed" || status === "cancelled";
  const method = (payment?.method ?? order.payment_method ?? "").toLowerCase();
  const canRejectPayment =
    method === "gcash" &&
    payment?.id &&
    !isPaymentSettled(payment.status, payment.paid_at);
  const code = order.order_code ?? order.id.slice(0, 8);

  return (
    <details className="relative" onClick={(event) => event.stopPropagation()}>
      <summary className="inline-flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition marker:hidden hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800">
        <MoreVertical className="h-4 w-4" />
        <span className="sr-only">More actions</span>
      </summary>
      <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-sm shadow-lg">
        {onOpenDetails ? (
          <button
            type="button"
            className="block w-full px-3 py-2 text-left font-medium text-stone-700 hover:bg-stone-50"
            onClick={() => onOpenDetails(order)}
          >
            Open full details
          </button>
        ) : null}
        {!isTerminal ? (
          <button
            type="button"
            className="block w-full px-3 py-2 text-left font-medium text-red-700 hover:bg-red-50"
            onClick={() => {
              if (window.confirm(`Cancel Order ${code}?`)) {
                void onUpdateStatus(order.id, "cancelled");
              }
            }}
          >
            Cancel order
          </button>
        ) : null}
        {canRejectPayment ? (
          <button
            type="button"
            className="block w-full px-3 py-2 text-left font-medium text-red-700 hover:bg-red-50"
            onClick={() => {
              if (payment?.id && window.confirm(`Reject receipt for Order ${code}?`)) {
                void onVerifyPayment(payment.id, order.id, "rejected");
              }
            }}
          >
            Mark payment invalid
          </button>
        ) : null}
        <button
          type="button"
          className="block w-full px-3 py-2 text-left font-medium text-stone-500 hover:bg-stone-50"
          onClick={() => void onDeleteOrder(order)}
        >
          Delete order
        </button>
      </div>
    </details>
  );
}

export function OrdersCompactTable({
  orders,
  payments,
  items,
  paymentByOrderId,
  itemsByOrderId,
  selectedOrderId,
  onSelectOrder,
  onOpenDetails,
  onEditOrder,
  onUpdateStatus,
  onVerifyPayment,
  onMarkPaymentPaid,
  onRecordRepayment,
  onDeleteOrder,
}: Props) {
  if (orders.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
        <Package className="h-8 w-8 text-stone-300" />
        <p className="mt-2 text-sm font-semibold text-stone-500">No orders found</p>
        <p className="mt-0.5 text-xs text-stone-400">Try a different filter or search query.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <div className="min-w-[860px]">
          <div
            className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50"
            style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
          >
            <GridHeaderCell>
              <span className="sr-only">Select</span>
            </GridHeaderCell>
            <GridHeaderCell>Order & Customer</GridHeaderCell>
            <GridHeaderCell>Location</GridHeaderCell>
            <GridHeaderCell>Items</GridHeaderCell>
            <GridHeaderCell className="justify-end pr-3">Total</GridHeaderCell>
            <GridHeaderCell>Payment</GridHeaderCell>
            <GridHeaderCell>Pay Status</GridHeaderCell>
            <GridHeaderCell>Status</GridHeaderCell>
            <GridHeaderCell>Actions</GridHeaderCell>
          </div>

          {orders.map((order) => {
            const payment = getLatestPayment(payments, order.id, paymentByOrderId);
            const orderItems = getOrderItems(items, order.id, itemsByOrderId);
            const code = order.order_code ?? order.id.slice(0, 8);
            const location = orderLocation(order);
            const compactLocation = formatCompactLocation(location);
            const accent = rowAccent(order, payment);
            const isSelected = selectedOrderId === order.id;

            return (
              <div
                key={order.id}
                role={onSelectOrder ? "button" : undefined}
                tabIndex={onSelectOrder ? 0 : undefined}
                aria-selected={isSelected}
                onClick={() => onSelectOrder?.(order)}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                  if (!onSelectOrder) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectOrder(order);
                  }
                }}
                className={`border-b border-stone-100 transition-colors ${
                  onSelectOrder
                    ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    : ""
                } ${
                  isSelected
                    ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200"
                    : "hover:bg-stone-50/80"
                } ${accent}`}
                style={{ display: "grid", gridTemplateColumns: GRID_COLS, minHeight: "60px" }}
              >
                <GridCell className="justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    aria-label={`Select ${code}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectOrder?.(order);
                    }}
                    className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600"
                  />
                </GridCell>

                <GridCell>
                  <div className="min-w-0 leading-snug">
                    <div className="truncate font-mono text-[11px] font-bold uppercase text-stone-600">
                      {code}
                    </div>
                    <div className="mt-0.5 truncate text-[13px] font-semibold text-stone-950">
                      {order.customer_name || "-"}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-stone-400">
                      {order.contact?.trim() || "No contact"} · {timeAgo(order.created_at)}
                    </div>
                  </div>
                </GridCell>

                <GridCell>
                  <span
                    title={location}
                    className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{compactLocation}</span>
                  </span>
                </GridCell>

                <GridCell>
                  <ItemsPreview items={orderItems} />
                </GridCell>

                <GridCell className="justify-end pr-3">
                  <span className="text-sm font-bold tabular-nums text-stone-950">
                    {peso(order.total_cents)}
                  </span>
                </GridCell>

                <GridCell>
                  <PaymentTypeBadge payment={payment} order={order} />
                </GridCell>

                <GridCell>
                  <PaymentBadge payment={payment} order={order} />
                </GridCell>

                <GridCell>
                  <OrderStatusBadge status={order.status} size="sm" />
                </GridCell>

                <GridCell>
                  <div className="flex items-center gap-1.5">
                    <ActionIconButton label="Inspect order" onClick={() => onSelectOrder?.(order)}>
                      <Eye className="h-4 w-4" />
                    </ActionIconButton>
                    <ActionIconButton label="Manage order" onClick={() => onEditOrder?.(order)}>
                      <Pencil className="h-4 w-4" />
                    </ActionIconButton>
                    <MoreMenu
                      order={order}
                      payment={payment}
                      onOpenDetails={onOpenDetails}
                      onUpdateStatus={onUpdateStatus}
                      onVerifyPayment={onVerifyPayment}
                      onDeleteOrder={onDeleteOrder}
                    />
                  </div>
                </GridCell>
              </div>
            );
          })}
        </div>
      </div>

      <div className="md:hidden">
        {orders.map((order) => {
          const payment = getLatestPayment(payments, order.id, paymentByOrderId);
          const orderItems = getOrderItems(items, order.id, itemsByOrderId);
          const code = order.order_code ?? order.id.slice(0, 8);
          const location = orderLocation(order);
          const compactLocation = formatCompactLocation(location);
          const accent = rowAccent(order, payment);
          const isSelected = selectedOrderId === order.id;

          return (
            <div
              key={order.id}
              role={onSelectOrder ? "button" : undefined}
              tabIndex={onSelectOrder ? 0 : undefined}
              aria-selected={isSelected}
              onClick={() => onSelectOrder?.(order)}
              onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (!onSelectOrder) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectOrder(order);
                }
              }}
              className={`border-b border-stone-100 px-4 py-3.5 transition ${
                onSelectOrder
                  ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  : ""
              } ${
                isSelected ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200" : ""
              } ${accent}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-stone-700">{code}</span>
                <span className="text-base font-bold tabular-nums text-stone-950">
                  {peso(order.total_cents)}
                </span>
              </div>

              <div className="mt-1 text-sm text-stone-700">
                <span className="font-semibold">{order.customer_name || "-"}</span>
                <span className="mx-1.5 text-stone-300">·</span>
                <span className="font-medium text-orange-700" title={location}>
                  {compactLocation}
                </span>
              </div>

              <div className="mt-0.5 text-xs text-stone-400">
                {order.contact?.trim() || "No contact"} · {timeAgo(order.created_at)}
              </div>

              <div className="mt-2">
                <ItemsPreview items={orderItems} />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <PaymentTypeBadge payment={payment} order={order} />
                <PaymentBadge payment={payment} order={order} />
                <OrderStatusBadge status={order.status} size="sm" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onEditOrder?.(order)}
                  className="h-10 rounded-lg border border-stone-200 bg-white text-sm font-semibold text-stone-700"
                >
                  Manage
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDetails?.(order)}
                  className="h-10 rounded-lg border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800"
                >
                  Details
                </button>
              </div>

              <MobileOrderActions
                order={order}
                payment={payment}
                onUpdateStatus={onUpdateStatus}
                onVerifyPayment={onVerifyPayment}
                onMarkPaymentPaid={onMarkPaymentPaid}
                onRecordRepayment={onRecordRepayment}
                onDeleteOrder={onDeleteOrder}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
