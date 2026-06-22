"use client";

import { Package } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import type { OrderItemRow, OrderRow, PaymentRow } from "../OrdersClient";
import { locationLabel, peso, timeAgo } from "../lib/labels";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentBadge } from "./PaymentBadge";
import { PaymentTypeBadge } from "./PaymentTypeBadge";
import { OrderActionButtons } from "./OrderActionButtons";
import { MobileOrderActions } from "./MobileOrderActions";
import { isPaymentSettled, getCreditBalanceDue } from "@/lib/payments";

interface Props {
  orders: OrderRow[];
  payments: PaymentRow[];
  items: OrderItemRow[];
  selectedOrderId?: string | null;
  onSelectOrder?: (order: OrderRow) => void;
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

function getLatestPayment(payments: PaymentRow[], orderId: string): PaymentRow | undefined {
  return [...payments.filter((p) => p.order_id === orderId)].sort((a, b) =>
    a.created_at > b.created_at ? -1 : 1
  )[0];
}

function orderLocation(order: OrderRow): string {
  if (order.delivery_location && order.delivery_location.trim().length > 0) {
    return locationLabel(order.delivery_location);
  }
  return locationLabel(order.pickup_location);
}

function orderItemsPreview(items: OrderItemRow[], orderId: string): string {
  const orderItems = items.filter((i) => i.order_id === orderId && i.qty > 0);
  if (orderItems.length === 0) return "—";
  const preview = orderItems.slice(0, 4).map((i) => `${i.qty}× ${i.name_snapshot || "Item"}`);
  const remaining = orderItems.length - preview.length;
  if (remaining > 0) preview.push(`+${remaining}`);
  return preview.join(", ");
}

function rowAccent(order: OrderRow, payment: PaymentRow | undefined): string {
  const status = order.status ?? "pending";
  const method = (payment?.method ?? order.payment_method ?? "").toLowerCase();
  const isPaid = isPaymentSettled(payment?.status, payment?.paid_at);
  const creditBalance = getCreditBalanceDue(payment, order.total_cents ?? 0);

  if (status === "cancelled" || status === "completed") return "border-l-transparent";
  if (method === "gcash" && !isPaid && payment?.proof_url) return "border-l-[3px] border-l-blue-400";
  if ((method === "credit" || method === "deposit") && creditBalance > 0) return "border-l-[3px] border-l-purple-400";
  if (status === "ready") return "border-l-[3px] border-l-emerald-400";
  if (status === "pending") return "border-l-[3px] border-l-amber-400";
  return "border-l-transparent";
}

const GRID_COLS = "160px 130px minmax(420px, 1fr) 90px 120px 170px 120px 220px";

function GridHeaderCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400 ${className}`}>
      {children}
    </div>
  );
}

function GridCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center py-2 ${className}`}>
      {children}
    </div>
  );
}

export function OrdersTable({
  orders,
  payments,
  items,
  selectedOrderId,
  onSelectOrder,
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
      {/* Desktop — CSS grid table with horizontal scroll */}
      <div className="hidden overflow-x-auto md:block">
        <div>
          {/* Sticky header */}
          <div
            className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50"
            style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
          >
            <GridHeaderCell>Order / Customer</GridHeaderCell>
            <GridHeaderCell>Location</GridHeaderCell>
            <GridHeaderCell>Items</GridHeaderCell>
            <GridHeaderCell className="justify-end pr-4">Total</GridHeaderCell>
            <GridHeaderCell>Type</GridHeaderCell>
            <GridHeaderCell>Status</GridHeaderCell>
            <GridHeaderCell>Order</GridHeaderCell>
            <GridHeaderCell>Actions</GridHeaderCell>
          </div>

          {/* Rows */}
          {orders.map((order) => {
            const payment = getLatestPayment(payments, order.id);
            const code = order.order_code ?? order.id.slice(0, 8);
            const location = orderLocation(order);
            const itemsPreview = orderItemsPreview(items, order.id);
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
                style={{ display: "grid", gridTemplateColumns: GRID_COLS, minHeight: "72px" }}
              >
                {/* Order / Customer */}
                <GridCell>
                  <div className="leading-snug">
                    <div className="font-mono text-[11px] font-bold text-stone-500">{code}</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-stone-900">
                      {order.customer_name || "—"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-stone-400">
                      {order.contact?.trim() || "No contact"} · {timeAgo(order.created_at)}
                    </div>
                  </div>
                </GridCell>

                {/* Location */}
                <GridCell>
                  <span className="text-xs font-medium text-amber-700">{location}</span>
                </GridCell>

                {/* Items */}
                <GridCell className="items-start py-2.5">
                  <div
                    className="text-sm leading-snug text-stone-700 whitespace-normal break-words line-clamp-4"
                    title={itemsPreview}
                  >
                    {itemsPreview}
                  </div>
                </GridCell>

                {/* Total */}
                <GridCell className="justify-end pr-4">
                  <span className="text-sm font-bold tabular-nums text-stone-900">
                    {peso(order.total_cents)}
                  </span>
                </GridCell>

                {/* Payment Type */}
                <GridCell>
                  <PaymentTypeBadge payment={payment} order={order} />
                </GridCell>

                {/* Payment Status */}
                <GridCell>
                  <PaymentBadge payment={payment} order={order} />
                </GridCell>

                {/* Order Status */}
                <GridCell>
                  <OrderStatusBadge status={order.status} size="sm" />
                </GridCell>

                {/* Actions */}
                <GridCell>
                  <OrderActionButtons
                    order={order}
                    payment={payment}
                    onUpdateStatus={onUpdateStatus}
                    onVerifyPayment={onVerifyPayment}
                    onMarkPaymentPaid={onMarkPaymentPaid}
                    onRecordRepayment={onRecordRepayment}
                    onDeleteOrder={onDeleteOrder}
                  />
                </GridCell>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        {orders.map((order) => {
          const payment = getLatestPayment(payments, order.id);
          const code = order.order_code ?? order.id.slice(0, 8);
          const location = orderLocation(order);
          const itemsPreview = orderItemsPreview(items, order.id);
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
              {/* Line 1: Code + Total */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-stone-600">{code}</span>
                <span className="text-base font-bold tabular-nums text-stone-900">
                  {peso(order.total_cents)}
                </span>
              </div>

              {/* Line 2: Customer + Location */}
              <div className="mt-1 text-sm text-stone-700">
                <span className="font-semibold">{order.customer_name || "—"}</span>
                <span className="mx-1.5 text-stone-300">·</span>
                <span className="font-medium text-amber-700">{location}</span>
              </div>

              {/* Line 3: Contact + Time */}
              <div className="mt-0.5 text-xs text-stone-400">
                {order.contact?.trim() || "No contact"} · {timeAgo(order.created_at)}
              </div>

              {/* Line 4: Items */}
              <div className="mt-1.5 text-sm leading-snug text-stone-600 whitespace-normal break-words line-clamp-3">
                {itemsPreview}
              </div>

              {/* Line 5: Badges */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <PaymentTypeBadge payment={payment} order={order} />
                <PaymentBadge payment={payment} order={order} />
                <OrderStatusBadge status={order.status} size="sm" />
              </div>

              {/* Line 6: Mobile actions */}
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
