"use client";

import type { MouseEvent } from "react";
import type { OrderRow, PaymentRow } from "../OrdersClient";
import { isPaymentSettled } from "@/lib/payments";

type ActionTone = "amber" | "emerald" | "blue" | "purple" | "red" | "stone";

type ActionItem = {
  key: string;
  label: string;
  tone: ActionTone;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

const TONE_CLASSES: Record<ActionTone, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  purple: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
  red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  stone: "border-transparent text-stone-400 hover:text-stone-600 hover:bg-stone-100",
};

interface Props {
  order: OrderRow;
  payment: PaymentRow | undefined;
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

export function OrderActionButtons({
  order,
  payment,
  onUpdateStatus,
  onVerifyPayment,
  onMarkPaymentPaid,
  onRecordRepayment,
  onDeleteOrder,
}: Props) {
  const method = (payment?.method ?? order.payment_method ?? "").toLowerCase();
  const isCreditLike = method === "credit" || method === "deposit";
  const isPaid = isPaymentSettled(payment?.status, payment?.paid_at);
  const hasPaymentId = Boolean(payment?.id);
  const orderCode = order.order_code ?? order.id.slice(0, 8);
  const status = order.status ?? "pending";
  const isTerminal = status === "completed" || status === "cancelled";

  const requiresManualConfirm = method === "cod" || method === "cash" || isCreditLike;

  const orderActions: ActionItem[] = [];
  const paymentActions: ActionItem[] = [];

  // ── Order workflow ──
  if (status === "pending") {
    if (requiresManualConfirm) {
      orderActions.push({
        key: "confirm",
        label: "Confirm",
        tone: "amber",
        onClick: (e) => {
          e.stopPropagation();
          void onUpdateStatus(order.id, "confirmed");
        },
      });
    }
    orderActions.push({
      key: "reject",
      label: "Reject",
      tone: "red",
      onClick: (e) => {
        e.stopPropagation();
        if (confirm(`Reject Order ${orderCode}?\n\nThis cannot be undone.`)) {
          void onUpdateStatus(order.id, "cancelled");
        }
      },
    });
  } else if (status === "confirmed") {
    orderActions.push({
      key: "prepare",
      label: "Prepare",
      tone: "emerald",
      onClick: (e) => {
        e.stopPropagation();
        void onUpdateStatus(order.id, "preparing");
      },
    });
    orderActions.push({
      key: "cancel",
      label: "Cancel",
      tone: "red",
      onClick: (e) => {
        e.stopPropagation();
        if (confirm(`Cancel Order ${orderCode}?\n\nThis cannot be undone.`)) {
          void onUpdateStatus(order.id, "cancelled");
        }
      },
    });
  } else if (status === "preparing") {
    orderActions.push({
      key: "ready",
      label: "Mark Ready",
      tone: "emerald",
      onClick: (e) => {
        e.stopPropagation();
        void onUpdateStatus(order.id, "ready");
      },
    });
    orderActions.push({
      key: "cancel",
      label: "Cancel",
      tone: "red",
      onClick: (e) => {
        e.stopPropagation();
        if (confirm(`Cancel Order ${orderCode}?\n\nThis cannot be undone.`)) {
          void onUpdateStatus(order.id, "cancelled");
        }
      },
    });
  } else if (status === "ready") {
    orderActions.push({
      key: "complete",
      label: "Complete",
      tone: "emerald",
      onClick: (e) => {
        e.stopPropagation();
        void onUpdateStatus(order.id, "completed");
      },
    });
    orderActions.push({
      key: "cancel",
      label: "Cancel",
      tone: "red",
      onClick: (e) => {
        e.stopPropagation();
        if (confirm(`Cancel Order ${orderCode}?\n\nThis cannot be undone.`)) {
          void onUpdateStatus(order.id, "cancelled");
        }
      },
    });
  }

  // ── Payment actions ──
  if (!isPaid && hasPaymentId && !isTerminal) {
    if (method === "gcash") {
      paymentActions.push({
        key: "pay-received",
        label: "Payment Received",
        tone: "blue",
        onClick: (e) => {
          e.stopPropagation();
          if (
            confirm(
              `Mark GCash payment for Order ${orderCode} as paid?\n\nOnly confirm after checking your GCash app.`
            ) &&
            payment?.id
          ) {
            void onVerifyPayment(payment.id, order.id, "paid");
          }
        },
      });
      paymentActions.push({
        key: "receipt-invalid",
        label: "Invalid",
        tone: "red",
        onClick: (e) => {
          e.stopPropagation();
          if (
            confirm(`Reject receipt for Order ${orderCode}?`) && payment?.id
          ) {
            void onVerifyPayment(payment.id, order.id, "rejected");
          }
        },
      });
    } else if (method === "cash" || method === "cod") {
      paymentActions.push({
        key: "cash-received",
        label: "Payment Received",
        tone: "emerald",
        onClick: (e) => {
          e.stopPropagation();
          if (confirm(`Mark cash payment received for Order ${orderCode}?`) && payment?.id) {
            void onMarkPaymentPaid(payment.id, order.id);
          }
        },
      });
    } else if (isCreditLike) {
      paymentActions.push({
        key: "credit-paid",
        label: "Paid Balance",
        tone: "purple",
        onClick: (e) => {
          e.stopPropagation();
          void onRecordRepayment(order);
        },
      });
    } else {
      paymentActions.push({
        key: "generic-paid",
        label: "Payment Received",
        tone: "emerald",
        onClick: (e) => {
          e.stopPropagation();
          if (payment?.id) void onMarkPaymentPaid(payment.id, order.id);
        },
      });
    }
  }

  // ── Delete (subtle, always last) ──
  orderActions.push({
    key: "delete",
    label: "×",
    tone: "stone",
    onClick: (e) => {
      e.stopPropagation();
      void onDeleteOrder(order);
    },
  });

  const renderButtons = (actions: ActionItem[]) =>
    actions.map((a) => (
      <button
        key={a.key}
        type="button"
        title={a.label}
        onClick={a.onClick}
        className={`inline-flex shrink-0 items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none transition active:scale-[0.98] ${TONE_CLASSES[a.tone]}`}
      >
        {a.label}
      </button>
    ));

  const hasOrder = orderActions.length > 0;
  const hasPayment = paymentActions.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {hasOrder && renderButtons(orderActions)}

      {hasOrder && hasPayment && (
        <span className="mx-0.5 h-3.5 w-px bg-stone-200" aria-hidden="true" />
      )}

      {hasPayment && renderButtons(paymentActions)}

      {!hasOrder && !hasPayment && (
        <span className="text-[11px] text-stone-300">—</span>
      )}
    </div>
  );
}
