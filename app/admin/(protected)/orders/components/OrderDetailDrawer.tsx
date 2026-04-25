"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { OrderItemRow, OrderRow, PaymentRow } from "../OrdersClient";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentBadge } from "./PaymentBadge";
import { OrderActionButtons } from "./OrderActionButtons";
import {
  formatTime,
  locationLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  peso,
} from "../lib/labels";
import { getCreditBalanceDue } from "@/lib/payments";

interface Props {
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
  onMarkPaymentPaid: (
    paymentId: string,
    orderId: string
  ) => void | Promise<void>;
  onRecordRepayment: (order: OrderRow) => void | Promise<void>;
  onDeleteOrder: (order: OrderRow) => void | Promise<void>;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-medium text-stone-900">{value}</span>
    </div>
  );
}

export function OrderDetailDrawer({
  open,
  order,
  payment,
  items,
  onClose,
  onUpdateStatus,
  onVerifyPayment,
  onMarkPaymentPaid,
  onRecordRepayment,
  onDeleteOrder,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !order) {
    return null;
  }

  const orderCode = order.order_code ?? order.id.slice(0, 8);
  const location = order.delivery_location
    ? locationLabel(order.delivery_location)
    : locationLabel(order.pickup_location);
  const total = order.total_cents ?? 0;
  const subtotal = order.subtotal_cents ?? 0;
  const deliveryFee = order.delivery_fee_cents ?? 0;
  const creditBalance = getCreditBalanceDue(payment, total);
  const reference = payment?.reference_number ?? payment?.gcash_ref ?? null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40"
        onClick={onClose}
        aria-label="Close drawer overlay"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Order Details
            </div>
            <h2 className="mt-1 font-mono text-lg font-bold text-stone-900">
              {orderCode}
            </h2>
            <p className="text-xs text-stone-500">{formatTime(order.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition hover:bg-stone-50"
            aria-label="Close order details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">Order Header</h3>
              <OrderStatusBadge status={order.status} />
            </div>
            <InfoRow label="Customer" value={order.customer_name ?? "-"} />
            <InfoRow label="Contact" value={order.contact ?? "-"} />
            <InfoRow label="Location" value={location} />
            <InfoRow
              label="Notes"
              value={order.notes ? <span className="max-w-[320px]">{order.notes}</span> : "-"}
            />
          </section>

          <section className="space-y-2 rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-semibold text-stone-900">Items</h3>
            <div className="mb-1 text-xs text-stone-500">{items.length} line item(s)</div>
            {items.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-stone-200">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {items.map((item) => {
                      const lineTotal =
                        item.line_total_cents > 0
                          ? item.line_total_cents
                          : item.qty * item.unit_price_cents;

                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-stone-800">
                            {item.name_snapshot || "Unknown Item"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-stone-600">
                            {item.qty}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-stone-600">
                            {peso(item.unit_price_cents)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-stone-900">
                            {peso(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-stone-300 p-4 text-xs text-stone-500">
                No order items loaded yet.
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-semibold text-stone-900">Totals</h3>
            <InfoRow label="Subtotal" value={peso(subtotal)} />
            <InfoRow label="Delivery Fee" value={peso(deliveryFee)} />
            <InfoRow label="Total" value={<span className="text-base">{peso(total)}</span>} />
          </section>

          <section className="space-y-2 rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-semibold text-stone-900">Payment</h3>
            <div>
              <PaymentBadge payment={payment} order={order} />
            </div>
            <InfoRow label="Method" value={paymentMethodLabel(payment?.method ?? order.payment_method)} />
            <InfoRow label="Status" value={paymentStatusLabel(payment?.status, payment?.paid_at)} />
            <InfoRow
              label="Amount"
              value={peso(payment?.amount_cents ?? order.total_cents ?? 0)}
            />
            {reference && <InfoRow label="Reference" value={<span className="font-mono text-xs">{reference}</span>} />}
            {payment?.paid_at && <InfoRow label="Paid At" value={formatTime(payment.paid_at)} />}
            {(payment?.method ?? order.payment_method ?? "").toLowerCase() === "credit" && (
              <InfoRow
                label="Balance Due"
                value={
                  <span className={creditBalance > 0 ? "text-purple-700" : "text-emerald-700"}>
                    {peso(creditBalance)}
                  </span>
                }
              />
            )}
            {payment?.proof_url && (
              <div className="space-y-2 border-t border-stone-200 pt-3">
                <a
                  href={payment.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-xs font-semibold text-blue-700 hover:underline"
                >
                  View uploaded receipt
                </a>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={payment.proof_url}
                  alt="Uploaded receipt"
                  className="max-h-72 w-full rounded-lg border border-stone-200 object-contain"
                />
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-semibold text-stone-900">Admin Actions</h3>
            <OrderActionButtons
              order={order}
              payment={payment}
              onUpdateStatus={onUpdateStatus}
              onVerifyPayment={onVerifyPayment}
              onMarkPaymentPaid={onMarkPaymentPaid}
              onRecordRepayment={onRecordRepayment}
              onDeleteOrder={onDeleteOrder}
            />
          </section>
        </div>
      </aside>
    </div>
  );
}
