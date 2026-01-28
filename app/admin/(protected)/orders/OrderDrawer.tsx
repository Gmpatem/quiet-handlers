"use client";

import { useMemo, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
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

  // ✅ injected formatter so we keep one logic source
  pickupLabel: (o: OrderRow) => string;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const supabase = useMemo(() => supabaseBrowser(), []);

  if (!open || order === null) return null;
  const o = order;

  const latestPayment = [...(payments ?? [])].sort((a, b) => (a.created_at > b.created_at ? -1 : 1))[0];

  async function deleteOrder() {
    const code = o.order_code ?? o.id.slice(0, 8);

    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      alert('Type "DELETE" to confirm.');
      return;
    }

    const ok = confirm(`Delete order ${code}? This cannot be undone.`);
    if (!ok) return;

    startTransition(async () => {
      try {
        const { error: oiErr } = await supabase.from("order_items").delete().eq("order_id", o.id);
        if (oiErr) throw new Error(`order_items: ${oiErr.message}`);

        const { error: payErr } = await supabase.from("payments").delete().eq("order_id", o.id);
        if (payErr) throw new Error(`payments: ${payErr.message}`);

        const { error: oErr } = await supabase.from("orders").delete().eq("id", o.id);
        if (oErr) throw new Error(`orders: ${oErr.message}`);

        setOpen(false);
      } catch (e: any) {
        alert(e?.message ?? "Failed to delete order");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-label="Close" />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-sm text-slate-500">Order</div>
            <div className="text-lg font-semibold">{o.order_code ?? o.id.slice(0, 8)}</div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
            Close
          </button>
        </div>

        <div className="space-y-5 p-5">
          {isPending && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Working…</div>}

          {/* Customer */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold">Customer</div>
            <div className="mt-2 text-sm">
              <div className="font-medium">{o.customer_name ?? "—"}</div>
              <div className="text-slate-600">{o.contact ?? "—"}</div>

              <div className="mt-2 text-slate-700">
                <span className="text-slate-500">Pickup point:</span> {pickupLabel(o)}
              </div>

              {o.delivery_location ? (
                <div className="mt-2 text-slate-700">
                  <span className="text-slate-500">Location:</span> {o.delivery_location}
                </div>
              ) : null}

              {o.notes ? (
                <div className="mt-2 text-slate-700">
                  <span className="text-slate-500">Notes:</span> {o.notes}
                </div>
              ) : null}

              <div className="mt-2 text-xs text-slate-500">Created: {time(o.created_at)}</div>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold">Totals</div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold">{peso(o.subtotal_cents ?? 0)}</span>
              </div>

              {String(o.fulfillment) === "delivery" && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivery fee</span>
                  <span className="font-semibold">{peso(o.delivery_fee_cents ?? 0)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{peso(o.total_cents ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold">Payment</div>
            <div className="mt-2 text-sm text-slate-700">
              <div>
                Method: <span className="font-semibold">{String(o.payment_method)}</span>
              </div>
              <div className="mt-1">
                Latest status: <span className="font-semibold">{latestPayment?.status ?? "—"}</span>
              </div>
              {latestPayment?.reference_number ? (
                <div className="mt-1">
                  Ref: <span className="font-mono text-xs">{latestPayment.reference_number}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Status actions */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold">Order status</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"].map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(o.id, s)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="text-sm font-semibold text-red-800">Danger zone</div>
            <div className="mt-2 text-xs text-red-700">Deleting removes the order + items + payments permanently.</div>

            <div className="mt-3 grid gap-2">
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE" to enable'
                className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
              />

              <button
                onClick={deleteOrder}
                className="rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={deleteConfirm.trim().toUpperCase() !== "DELETE" || isPending}
              >
                Delete order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
