"use client";

import type { OrderRow, PaymentRow } from "../OrdersClient";
import { isPaymentSettled } from "@/lib/payments";

interface Props {
  orders: OrderRow[];
  payments: PaymentRow[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

function getLatestPayment(
  payments: PaymentRow[],
  orderId: string
): PaymentRow | undefined {
  return [...payments.filter((p) => p.order_id === orderId)].sort((a, b) =>
    a.created_at > b.created_at ? -1 : 1
  )[0];
}

interface CardConfig {
  label: string;
  count: number;
  filter: string;
  tone: "amber" | "blue" | "red" | "emerald" | "stone";
}

const TONE_CLASSES: Record<CardConfig["tone"], string> = {
  amber: "text-amber-700",
  blue: "text-blue-700",
  red: "text-red-700",
  emerald: "text-emerald-700",
  stone: "text-stone-700",
};

const ACTIVE_CLASSES: Record<CardConfig["tone"], string> = {
  amber: "border-amber-300 bg-amber-50",
  blue: "border-blue-300 bg-blue-50",
  red: "border-red-300 bg-red-50",
  emerald: "border-emerald-300 bg-emerald-50",
  stone: "border-stone-300 bg-stone-50",
};

export function OrderSummaryCards({
  orders,
  payments,
  activeFilter,
  onFilterChange,
}: Props) {
  const newOrders = orders.filter((order) => (order.status ?? "pending") === "pending");

  const gcashProof = orders.filter((order) => {
    const payment = getLatestPayment(payments, order.id);
    return (
      (payment?.method ?? order.payment_method ?? "").toLowerCase() === "gcash" &&
      Boolean(payment?.proof_url) &&
      !isPaymentSettled(payment?.status, payment?.paid_at)
    );
  });

  const unpaid = orders.filter((order) => {
    const payment = getLatestPayment(payments, order.id);
    if (!payment) return true;
    return !isPaymentSettled(payment.status, payment.paid_at);
  });

  const confirmed = orders.filter((order) => order.status === "confirmed");
  const cancelled = orders.filter((order) => order.status === "cancelled");

  const cards: CardConfig[] = [
    { label: "New", count: newOrders.length, filter: "pending", tone: "amber" },
    { label: "GCash Proof", count: gcashProof.length, filter: "gcash_proof", tone: "blue" },
    { label: "Unpaid", count: unpaid.length, filter: "unpaid", tone: "red" },
    { label: "Confirmed", count: confirmed.length, filter: "confirmed", tone: "emerald" },
    { label: "Cancelled", count: cancelled.length, filter: "cancelled", tone: "stone" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {cards.map((card) => {
        const isActive = activeFilter === card.filter;
        return (
          <button
            type="button"
            key={card.filter}
            onClick={() => onFilterChange(isActive ? "all" : card.filter)}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 transition ${
              isActive
                ? ACTIVE_CLASSES[card.tone]
                : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              {card.label}
            </span>
            <span className={`text-sm font-bold tabular-nums ${TONE_CLASSES[card.tone]}`}>
              {card.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
