"use client";

import type { OrderRow, PaymentRow } from "../OrdersClient";
import { isPaymentSettled } from "@/lib/payments";

type ActionTone = "amber" | "emerald" | "blue" | "purple" | "red" | "stone";

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

const TONE_STYLES: Record<ActionTone, string> = {
  amber: "border-amber-300 bg-amber-50 text-amber-800 active:bg-amber-100",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-800 active:bg-emerald-100",
  blue: "border-blue-300 bg-blue-50 text-blue-800 active:bg-blue-100",
  purple: "border-purple-300 bg-purple-50 text-purple-800 active:bg-purple-100",
  red: "border-red-300 bg-red-50 text-red-800 active:bg-red-100",
  stone: "border-stone-200 bg-stone-50 text-stone-500 active:bg-stone-100",
};

export function MobileOrderActions({
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

  const workflowButtons: { label: string; tone: ActionTone; onClick: () => void }[] = [];
  const paymentButtons: { label: string; tone: ActionTone; onClick: () => void }[] = [];

  // ── Workflow actions ──
  if (status === "pending") {
    if (requiresManualConfirm) {
      workflowButtons.push({
        label: "Confirm",
        tone: "amber",
        onClick: () => void onUpdateStatus(order.id, "confirmed"),
      });
    }
    workflowButtons.push({
      label: "Reject",
      tone: "red",
      onClick: () => {
        if (confirm(`Reject Order ${orderCode}?\n\nThis cannot be undone.`)) {
          void onUpdateStatus(order.id, "cancelled");
        }
      },
    });
  } else if (status === "confirmed") {
    workflowButtons.push({
      label: "Start Preparing",
      tone: "emerald",
      onClick: () => void onUpdateStatus(order.id, "preparing"),
    });
    workflowButtons.push({
      label: "Cancel",
      tone: "red",
      onClick: () => {
        if (confirm(`Cancel Order ${orderCode}?\n\nThis cannot be undone.`)) {
          void onUpdateStatus(order.id, "cancelled");
        }
      },
    });
  } else if (status === "preparing") {
    workflowButtons.push({
      label: "Mark Ready",
      tone: "emerald",
      onClick: () => void onUpdateStatus(order.id, "ready"),
    });
    workflowButtons.push({
      label: "Cancel",
      tone: "red",
      onClick: () => {
        if (confirm(`Cancel Order ${orderCode}?\n\nThis cannot be undone.`)) {
          void onUpdateStatus(order.id, "cancelled");
        }
      },
    });
  } else if (status === "ready") {
    workflowButtons.push({
      label: "Complete",
      tone: "emerald",
      onClick: () => void onUpdateStatus(order.id, "completed"),
    });
    workflowButtons.push({
      label: "Cancel",
      tone: "red",
      onClick: () => {
        if (confirm(`Cancel Order ${orderCode}?\n\nThis cannot be undone.`)) {
          void onUpdateStatus(order.id, "cancelled");
        }
      },
    });
  }

  // ── Payment actions ──
  if (!isPaid && hasPaymentId && !isTerminal) {
    if (method === "gcash") {
      paymentButtons.push({
        label: "Payment Received",
        tone: "blue",
        onClick: () => {
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
      paymentButtons.push({
        label: "Receipt Invalid",
        tone: "red",
        onClick: () => {
          if (confirm(`Reject receipt for Order ${orderCode}?`) && payment?.id) {
            void onVerifyPayment(payment.id, order.id, "rejected");
          }
        },
      });
    } else if (method === "cash" || method === "cod") {
      paymentButtons.push({
        label: "Payment Received",
        tone: "emerald",
        onClick: () => {
          if (confirm(`Mark cash payment received for Order ${orderCode}?`) && payment?.id) {
            void onMarkPaymentPaid(payment.id, order.id);
          }
        },
      });
    } else if (isCreditLike) {
      paymentButtons.push({
        label: "Paid Balance",
        tone: "purple",
        onClick: () => void onRecordRepayment(order),
      });
    }
  }

  const hasWorkflow = workflowButtons.length > 0;
  const hasPayment = paymentButtons.length > 0;

  return (
    <div className="mt-3 grid gap-2" onClick={(e) => e.stopPropagation()}>
      {/* Workflow actions */}
      {hasWorkflow && (
        <div
          className={`grid gap-2 ${
            workflowButtons.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {workflowButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className={`h-11 rounded-lg border text-sm font-semibold transition active:scale-[0.98] ${TONE_STYLES[btn.tone]}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* Payment actions */}
      {hasPayment && (
        <div
          className={`grid gap-2 ${
            paymentButtons.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {paymentButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className={`h-11 rounded-lg border text-sm font-semibold transition active:scale-[0.98] ${TONE_STYLES[btn.tone]}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* Delete — always available, subtle */}
      {!isTerminal && (
        <button
          type="button"
          onClick={() => void onDeleteOrder(order)}
          className={`h-11 w-full rounded-lg border text-sm font-semibold transition active:scale-[0.98] ${TONE_STYLES.stone}`}
        >
          Delete Order
        </button>
      )}

      {isTerminal && (
        <button
          type="button"
          onClick={() => void onDeleteOrder(order)}
          className={`h-11 w-full rounded-lg border text-sm font-semibold transition active:scale-[0.98] ${TONE_STYLES.stone}`}
        >
          Delete Order
        </button>
      )}
    </div>
  );
}
