"use client";

import type { PaymentRow, OrderRow } from "../OrdersClient";

interface Props {
  payment: PaymentRow | undefined;
  order: OrderRow;
}

export function PaymentTypeBadge({ payment, order }: Props) {
  const method = (payment?.method ?? order.payment_method ?? "").toLowerCase();

  let label = "—";
  let tone = "border-stone-200 bg-stone-50 text-stone-500";

  if (method === "gcash") {
    label = "GCash";
    tone = "border-blue-200 bg-blue-50 text-blue-700";
  } else if (method === "cash" || method === "cod") {
    label = "Cash / COD";
    tone = "border-stone-200 bg-stone-50 text-stone-600";
  } else if (method === "credit" || method === "deposit") {
    label = "Credit / Deposit";
    tone = "border-purple-200 bg-purple-50 text-purple-700";
  }

  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded border px-1.5 py-px text-[10px] font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
