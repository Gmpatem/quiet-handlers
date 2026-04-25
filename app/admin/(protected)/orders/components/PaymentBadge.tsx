"use client";

import type { PaymentRow, OrderRow } from "../OrdersClient";
import { isPaymentSettled, getCreditBalanceDue } from "@/lib/payments";

interface Props {
  payment: PaymentRow | undefined;
  order: OrderRow;
}

export function PaymentBadge({ payment, order }: Props) {
  const method = (payment?.method ?? order.payment_method ?? "").toLowerCase();
  const status = (payment?.status ?? "").toLowerCase();
  const isPaid = isPaymentSettled(payment?.status, payment?.paid_at);
  const creditBalance = getCreditBalanceDue(payment, order.total_cents ?? 0);
  const isCreditLike = method === "credit" || method === "deposit";
  const hasOutstandingCredit = isCreditLike && creditBalance > 0;
  const hasProof = Boolean(payment?.proof_url);
  const reference = payment?.reference_number ?? payment?.gcash_ref ?? null;
  const isRejected = status === "rejected";

  let label = "Unknown";
  let tone = "border-stone-200 bg-stone-100 text-stone-700";

  if (isRejected) {
    label = "Rejected";
    tone = "border-red-200 bg-red-100 text-red-700";
  } else if (method === "gcash") {
    if (isPaid) {
      label = "GCash Paid";
      tone = "border-emerald-200 bg-emerald-100 text-emerald-700";
    } else if (hasProof) {
      label = "GCash Proof Submitted";
      tone = "border-blue-200 bg-blue-100 text-blue-700";
    } else {
      label = "GCash Pending";
      tone = "border-amber-200 bg-amber-100 text-amber-700";
    }
  } else if (isCreditLike) {
    if (hasOutstandingCredit || !isPaid) {
      label = "Credit / Deposit Unpaid";
      tone = "border-purple-200 bg-purple-100 text-purple-700";
    } else {
      label = "Credit / Deposit Paid";
      tone = "border-emerald-200 bg-emerald-100 text-emerald-700";
    }
  } else if (method === "cash" || method === "cod") {
    if (isPaid) {
      label = "Cash Paid";
      tone = "border-emerald-200 bg-emerald-100 text-emerald-700";
    } else {
      label = "Cash Unpaid";
      tone = "border-stone-200 bg-stone-100 text-stone-700";
    }
  } else if (isPaid) {
    label = "Paid";
    tone = "border-emerald-200 bg-emerald-100 text-emerald-700";
  } else {
    label = "Unpaid";
    tone = "border-stone-200 bg-stone-100 text-stone-700";
  }

  return (
    <div className="space-y-0.5">
      <span
        className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}
      >
        {label}
      </span>
      {reference && (
        <div className="max-w-[160px] truncate font-mono text-[9px] text-stone-400">
          {reference}
        </div>
      )}
    </div>
  );
}
