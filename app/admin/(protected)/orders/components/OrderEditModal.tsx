"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react";
import { getCreditBalanceDue, isPaymentSettled } from "@/lib/payments";
import { AdminActionButton } from "../../components/workflow/AdminActionButton";
import { AdminFormModal } from "../../components/workflow/AdminFormModal";
import type { OrderItemRow, OrderRow, PaymentRow } from "../OrdersClient";
import {
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
  formatTime,
  locationLabel,
  paymentMethodLabel,
  peso,
} from "../lib/labels";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentBadge } from "./PaymentBadge";
import { PaymentTypeBadge } from "./PaymentTypeBadge";

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
];

interface OrderEditModalProps {
  open: boolean;
  order: OrderRow | null;
  payment: PaymentRow | undefined;
  items: OrderItemRow[];
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: string) => void | Promise<void>;
  onVerifyPayment: (
    paymentId: string,
    orderId: string,
    status: "paid" | "rejected"
  ) => void | Promise<void>;
  onMarkPaymentPaid: (paymentId: string, orderId: string) => void | Promise<void>;
  onRecordRepayment: (order: OrderRow) => void | Promise<void>;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-semibold text-stone-900">{value}</span>
    </div>
  );
}

function paymentMethod(payment: PaymentRow | undefined, order: OrderRow) {
  return String(payment?.method ?? order.payment_method ?? "").toLowerCase();
}

export function OrderEditModal({
  open,
  order,
  payment,
  items,
  onClose,
  onUpdateStatus,
  onVerifyPayment,
  onMarkPaymentPaid,
  onRecordRepayment,
}: OrderEditModalProps) {
  const [statusDraft, setStatusDraft] = useState("pending");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  useEffect(() => {
    setStatusDraft(order?.status ?? "pending");
    setConfirmingOrder(false);
    setBusyAction(null);
  }, [order?.id, order?.status]);

  const orderCode = order?.order_code ?? order?.id.slice(0, 8) ?? "";
  const method = order ? paymentMethod(payment, order) : "";
  const isPaid = isPaymentSettled(payment?.status, payment?.paid_at);
  const isCreditLike = method === "credit" || method === "deposit";
  const balanceDue = order ? getCreditBalanceDue(payment, order.total_cents ?? 0) : 0;
  const location = order
    ? locationLabel(order.delivery_location || order.pickup_location)
    : "";
  const reference = payment?.reference_number ?? payment?.gcash_ref ?? null;
  const validItems = useMemo(() => items.filter((item) => item.qty > 0), [items]);
  const pendingGcashPayment = method === "gcash" && !isPaid;
  const canConfirmOrder = order?.status === "pending" && !pendingGcashPayment;
  const hasStatusChange = Boolean(order && statusDraft !== (order.status ?? "pending"));

  async function runAction(label: string, action: () => void | Promise<void>) {
    setBusyAction(label);
    try {
      await action();
      setConfirmingOrder(false);
    } finally {
      setBusyAction(null);
    }
  }

  if (!order) return null;

  const paymentAction = !isPaid && payment?.id ? (
    method === "gcash" ? (
      <AdminActionButton
        variant="primary"
        className="w-full"
        icon={<CheckCircle2 />}
        disabled={Boolean(busyAction)}
        onClick={() =>
          runAction("confirm-payment", () =>
            onVerifyPayment(payment.id, order.id, "paid")
          )
        }
      >
        {busyAction === "confirm-payment" ? "Confirming..." : "Confirm Payment"}
      </AdminActionButton>
    ) : method === "cash" || method === "cod" ? (
      <AdminActionButton
        variant="primary"
        className="w-full"
        icon={<CheckCircle2 />}
        disabled={Boolean(busyAction)}
        onClick={() =>
          runAction("mark-paid", () => onMarkPaymentPaid(payment.id, order.id))
        }
      >
        {busyAction === "mark-paid" ? "Saving..." : "Mark Payment Paid"}
      </AdminActionButton>
    ) : isCreditLike && balanceDue > 0 ? (
      <AdminActionButton
        variant="primary"
        className="w-full"
        disabled={Boolean(busyAction)}
        onClick={() => runAction("credit-paid", () => onRecordRepayment(order))}
      >
        {busyAction === "credit-paid" ? "Saving..." : "Record Repayment"}
      </AdminActionButton>
    ) : null
  ) : null;

  const quickActions = [
    order.status === "confirmed"
      ? {
          key: "preparing",
          label: "Mark Preparing",
          icon: <Clock3 />,
          run: () => onUpdateStatus(order.id, "preparing"),
        }
      : null,
    order.status === "preparing"
      ? {
          key: "ready",
          label: "Mark Ready",
          icon: <PackageCheck />,
          run: () => onUpdateStatus(order.id, "ready"),
        }
      : null,
    order.status === "ready" && order.fulfillment === "delivery"
      ? {
          key: "out-for-delivery",
          label: "Out for Delivery",
          icon: <Truck />,
          run: () => onUpdateStatus(order.id, "out_for_delivery"),
        }
      : null,
    ["ready", "out_for_delivery"].includes(order.status ?? "")
      ? {
          key: "complete",
          label: "Complete Order",
          icon: <CheckCircle2 />,
          run: () => onUpdateStatus(order.id, "completed"),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: ReactNode;
    run: () => void | Promise<void>;
  }>;

  return (
    <AdminFormModal
      open={open}
      title="Manage Order"
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-stone-700">{orderCode}</span>
          <OrderStatusBadge status={order.status} size="sm" />
        </span>
      }
      onClose={() => {
        if (!busyAction) onClose();
      }}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <AdminActionButton variant="secondary" disabled={Boolean(busyAction)} onClick={onClose}>
            Close
          </AdminActionButton>
          <AdminActionButton
            variant="secondary"
            disabled={!hasStatusChange || Boolean(busyAction)}
            onClick={() =>
              runAction("save-status", () => onUpdateStatus(order.id, statusDraft))
            }
          >
            {busyAction === "save-status" ? "Saving..." : "Save Changes"}
          </AdminActionButton>
          {order.status === "pending" ? (
            <AdminActionButton
              variant={canConfirmOrder ? "primary" : "secondary"}
              disabled={!canConfirmOrder || Boolean(busyAction)}
              onClick={() => {
                if (!confirmingOrder) {
                  setConfirmingOrder(true);
                  return;
                }
                void runAction("confirm-order", () =>
                  onUpdateStatus(order.id, "confirmed")
                );
              }}
            >
              {busyAction === "confirm-order"
                ? "Confirming..."
                : confirmingOrder
                  ? "Confirm Now"
                  : "Confirm Order"}
            </AdminActionButton>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-stone-950">Order summary</h3>
            <span className="text-xs font-semibold text-stone-500">
              {formatTime(order.created_at)}
            </span>
          </div>
          <InfoRow label="Order Code" value={<span className="font-mono">{orderCode}</span>} />
          <InfoRow label="Customer" value={order.customer_name ?? "-"} />
          <InfoRow label="Contact" value={order.contact ?? "-"} />
          <InfoRow
            label="Fulfillment"
            value={order.fulfillment === "delivery" ? "Delivery" : "Pickup"}
          />
          <InfoRow label="Location" value={location} />
          <InfoRow
            label="Payment"
            value={
              <span className="inline-flex flex-wrap justify-end gap-1.5">
                <PaymentTypeBadge payment={payment} order={order} />
                <PaymentBadge payment={payment} order={order} />
              </span>
            }
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-stone-950">Totals</h3>
          <div className="grid gap-2 rounded-xl border border-stone-200 bg-white p-3">
            <InfoRow label="Subtotal" value={peso(order.subtotal_cents)} />
            <InfoRow label="Delivery Fee" value={peso(order.delivery_fee_cents)} />
            <InfoRow
              label="Total"
              value={<span className="text-orange-700">{peso(order.total_cents)}</span>}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-stone-950">Editable controls</h3>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
            Order status
            <select
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value)}
              disabled={Boolean(busyAction)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status] ?? status}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 rounded-xl border border-stone-200 bg-white p-3">
            <InfoRow label="Method" value={paymentMethodLabel(method)} />
            <InfoRow
              label="Status"
              value={PAYMENT_STATUS_LABELS[payment?.status ?? "pending"] ?? payment?.status ?? "Pending"}
            />
            {reference ? (
              <InfoRow label="Reference" value={<span className="font-mono text-xs">{reference}</span>} />
            ) : null}
            {isCreditLike ? <InfoRow label="Balance" value={peso(balanceDue)} /> : null}
          </div>
          {order.notes ? (
            <div className="rounded-xl border border-stone-200 bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                Notes
              </div>
              <p className="mt-1 text-sm leading-6 text-stone-700">{order.notes}</p>
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-stone-950">Quick workflow actions</h3>
          {pendingGcashPayment ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              Confirm payment before confirming this GCash order.
            </div>
          ) : null}
          {confirmingOrder ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Confirming changes this order from New to Confirmed.
            </div>
          ) : null}
          <div className="grid gap-2">
            {paymentAction}
            {order.status === "pending" && canConfirmOrder ? (
              <AdminActionButton
                variant="primary"
                className="w-full"
                icon={<CheckCircle2 />}
                disabled={Boolean(busyAction)}
                onClick={() => {
                  if (!confirmingOrder) {
                    setConfirmingOrder(true);
                    return;
                  }
                  void runAction("confirm-order", () =>
                    onUpdateStatus(order.id, "confirmed")
                  );
                }}
              >
                {confirmingOrder ? "Confirm Now" : "Confirm Order"}
              </AdminActionButton>
            ) : null}
            {quickActions.map((action) => (
              <AdminActionButton
                key={action.key}
                variant="secondary"
                className="w-full"
                icon={action.icon}
                disabled={Boolean(busyAction)}
                onClick={() => runAction(action.key, action.run)}
              >
                {busyAction === action.key ? "Saving..." : action.label}
              </AdminActionButton>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-stone-950">Items</h3>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {validItems.length ? (
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="w-12 px-2 py-2 text-right">Qty</th>
                    <th className="w-20 px-2 py-2 text-right">Price</th>
                    <th className="w-20 px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {validItems.map((item) => (
                    <tr key={item.id}>
                      <td className="min-w-0 px-3 py-2 font-semibold text-stone-800">
                        {item.name_snapshot || "Item"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-stone-600">
                        {item.qty}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-stone-600">
                        {peso(item.unit_price_cents)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-stone-950">
                        {peso(item.line_total_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-3 py-3 text-sm text-stone-500">No items loaded.</div>
            )}
          </div>
        </section>
      </div>
    </AdminFormModal>
  );
}
