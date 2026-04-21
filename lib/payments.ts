export type PaymentLike = {
  method?: string | null;
  status?: string | null;
  amount_cents?: number | null;
  balance_due_cents?: number | null;
  paid_at?: string | null;
};

const SETTLED_PAYMENT_STATUSES = new Set([
  "paid",
  "completed",
  "verified",
]);

export function isPaymentSettled(
  status?: string | null,
  paidAt?: string | null
) {
  if (paidAt) return true;
  return SETTLED_PAYMENT_STATUSES.has(String(status ?? "").toLowerCase());
}

export function getCreditBalanceDue(
  payment: PaymentLike | null | undefined,
  orderTotalCents = 0
) {
  if (!payment) return 0;
  if (String(payment.method ?? "").toLowerCase() !== "credit") return 0;

  const explicitBalance = Number(payment.balance_due_cents ?? 0);
  if (Number.isFinite(explicitBalance) && explicitBalance > 0) {
    return explicitBalance;
  }

  if (isPaymentSettled(payment.status, payment.paid_at)) return 0;

  const amount = Number(payment.amount_cents ?? orderTotalCents ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}
