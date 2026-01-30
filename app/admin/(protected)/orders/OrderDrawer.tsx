"use client";

import type { OrderRow, PaymentRow } from "./OrdersClient";

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

const ALLOWED_STATUSES = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "cancelled"] as const;

export default function OrderDrawer({
  open,
  setOpen,
  order,
  payments,
  onUpdateStatus,
  pickupLabel,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  order: OrderRow | null;
  payments: PaymentRow[];
  onUpdateStatus: (orderId: string, next: string) => void;
  pickupLabel: (o: OrderRow) => string;
}) {
  if (!open || order === null) return null;
  const o = order;

  const latestPayment = [...(payments ?? [])].sort((a, b) => (a.created_at > b.created_at ? -1 : 1))[0];

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-label="Close"
      />

      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white px-5 py-4">
          <div>
            <div className="text-xs font-medium text-stone-500">Order</div>
            <div className="text-lg font-bold text-stone-900">{o.order_code ?? o.id.slice(0, 8)}</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="touch-target rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:scale-95"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-100">
                <span className="text-xs">👤</span>
              </div>
              <div className="text-sm font-semibold text-stone-900">Customer</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Name</span>
                <span className="font-medium text-stone-900">{o.customer_name ?? "—"}</span>
              </div>
              {o.contact && o.contact !== "N/A" && (
                <div className="flex justify-between">
                  <span className="text-stone-600">Contact</span>
                  <span className="font-medium text-stone-700">{o.contact}</span>
                </div>
              )}

              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-xs">📍</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-amber-900">Pickup Location</div>
                    <div className="mt-0.5 font-medium text-amber-800">{pickupLabel(o)}</div>
                  </div>
                </div>
              </div>

              {o.delivery_location && (
                <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <div className="text-xs font-medium text-stone-600">Delivery Location</div>
                  <div className="mt-1 text-sm text-stone-700">{o.delivery_location}</div>
                </div>
              )}

              {o.notes && (
                <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <div className="text-xs font-medium text-stone-600">Notes</div>
                  <div className="mt-1 text-sm text-stone-700">{o.notes}</div>
                </div>
              )}

              <div className="mt-3 text-xs text-stone-500">Created: {time(o.created_at)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-100">
                <span className="text-xs">💰</span>
              </div>
              <div className="text-sm font-semibold text-stone-900">Totals</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Subtotal</span>
                <span className="font-semibold text-stone-900">{peso(o.subtotal_cents ?? 0)}</span>
              </div>

              {String(o.fulfillment) === "delivery" && (
                <div className="flex justify-between">
                  <span className="text-stone-600">Delivery fee</span>
                  <span className="font-semibold text-stone-900">{peso(o.delivery_fee_cents ?? 0)}</span>
                </div>
              )}

              <div className="border-t border-stone-200 pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-stone-900">Total</span>
                  <span className="text-lg font-bold text-amber-900">{peso(o.total_cents ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-100">
                <span className="text-xs">💳</span>
              </div>
              <div className="text-sm font-semibold text-stone-900">Payment</div>
            </div>
            <div className="space-y-2 text-sm text-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-600">Method</span>
                <span className="font-semibold text-stone-900">{String(o.payment_method).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Latest status</span>
                <span className="font-semibold text-stone-900">{latestPayment?.status ?? "—"}</span>
              </div>
              {latestPayment?.reference_number && (
                <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2">
                  <div className="text-xs text-stone-600">Reference</div>
                  <div className="mt-0.5 font-mono text-xs text-stone-900">{latestPayment.reference_number}</div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-stone-900">Update Order Status</div>
            <div className="grid grid-cols-2 gap-2">
              {ALLOWED_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(o.id, s)}
                  className="touch-target rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 active:scale-95"
                >
                  {s.replaceAll("_", " ")}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Orders are updated via admin RPCs. Payments are DB-controlled (no manual inserts).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
