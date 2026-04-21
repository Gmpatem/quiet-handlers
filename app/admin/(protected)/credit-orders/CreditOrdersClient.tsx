"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { getCreditBalanceDue } from "@/lib/payments";
import { Search, Wallet, Users, AlertCircle } from "lucide-react";

export type CreditOrderRow = {
  id: string;
  order_code: string | null;
  customer_name: string | null;
  contact: string | null;
  status: string | null;
  total_cents: number | null;
  created_at: string;
  updated_at: string;
  payment_method: string | null;
};

export type CreditPaymentRow = {
  id: string;
  order_id: string;
  method: string | null;
  amount_cents: number | null;
  balance_due_cents: number | null;
  reference_number: string | null;
  gcash_ref: string | null;
  proof_url: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string;
};

type CreditOrderRecord = {
  order: CreditOrderRow;
  payment: CreditPaymentRow | null;
  balance_due_cents: number;
};

type DebtorSummary = {
  debtor_key: string;
  customer_name: string;
  contact: string | null;
  total_balance_cents: number;
  total_orders: number;
  latest_order_date: string;
  related_orders: Array<{ order_id: string; order_code: string }>;
};

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format((cents ?? 0) / 100);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function latestPaymentsByOrder(payments: CreditPaymentRow[]) {
  const map = new Map<string, CreditPaymentRow>();
  for (const payment of payments) {
    const existing = map.get(payment.order_id);
    if (!existing || payment.created_at > existing.created_at) {
      map.set(payment.order_id, payment);
    }
  }
  return map;
}

export default function CreditOrdersClient({
  initialOrders,
  initialPayments,
}: {
  initialOrders: CreditOrderRow[];
  initialPayments: CreditPaymentRow[];
}) {
  const [payments, setPayments] = useState<CreditPaymentRow[]>(initialPayments ?? []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    | "all"
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "completed"
    | "delivered"
    | "cancelled"
  >("all");
  const [balanceFilter, setBalanceFilter] = useState<
    "outstanding" | "all" | "settled"
  >("outstanding");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest_balance"
  >("highest_balance");
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  const records = useMemo<CreditOrderRecord[]>(() => {
    const paymentMap = latestPaymentsByOrder(payments ?? []);
    return (initialOrders ?? []).map((order) => {
      const payment = paymentMap.get(order.id) ?? null;
      const fallbackOutstanding =
        String(order.payment_method ?? "").toLowerCase() === "credit"
          ? Number(order.total_cents ?? 0)
          : 0;
      const balanceDue = payment
        ? getCreditBalanceDue(payment, order.total_cents ?? 0)
        : fallbackOutstanding;

      return {
        order,
        payment,
        balance_due_cents: Number.isFinite(balanceDue) ? balanceDue : 0,
      };
    });
  }, [initialOrders, payments]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = records.filter((record) => {
      if (
        statusFilter !== "all" &&
        (record.order.status ?? "pending") !== statusFilter
      ) {
        return false;
      }

      if (balanceFilter === "outstanding" && record.balance_due_cents <= 0) {
        return false;
      }
      if (balanceFilter === "settled" && record.balance_due_cents > 0) {
        return false;
      }

      if (!q) return true;
      return (
        (record.order.order_code ?? "").toLowerCase().includes(q) ||
        (record.order.customer_name ?? "").toLowerCase().includes(q) ||
        (record.order.contact ?? "").toLowerCase().includes(q) ||
        (record.payment?.status ?? "").toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      if (sortBy === "highest_balance") {
        return b.balance_due_cents - a.balance_due_cents;
      }
      const left = String(a.order.created_at);
      const right = String(b.order.created_at);
      return sortBy === "oldest"
        ? left.localeCompare(right)
        : right.localeCompare(left);
    });

    return result;
  }, [records, search, statusFilter, balanceFilter, sortBy]);

  const outstandingCount = useMemo(
    () => records.filter((record) => record.balance_due_cents > 0).length,
    [records]
  );

  const settledCount = useMemo(
    () => records.filter((record) => record.balance_due_cents <= 0).length,
    [records]
  );

  const debtors = useMemo<DebtorSummary[]>(() => {
    const map = new Map<string, DebtorSummary>();

    for (const record of records) {
      if (record.balance_due_cents <= 0) continue;

      const customerName = record.order.customer_name ?? "Unknown";
      const contact = record.order.contact ?? null;
      const debtorKey = `${contact ?? ""}::${customerName}`.toLowerCase();

      const current = map.get(debtorKey) ?? {
        debtor_key: debtorKey,
        customer_name: customerName,
        contact,
        total_balance_cents: 0,
        total_orders: 0,
        latest_order_date: record.order.created_at,
        related_orders: [],
      };

      current.total_balance_cents += record.balance_due_cents;
      current.total_orders += 1;

      if (record.order.created_at > current.latest_order_date) {
        current.latest_order_date = record.order.created_at;
      }

      current.related_orders.push({
        order_id: record.order.id,
        order_code: record.order.order_code ?? record.order.id.slice(0, 8),
      });

      map.set(debtorKey, current);
    }

    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter((debtor) => {
        if (!q) return true;
        return (
          debtor.customer_name.toLowerCase().includes(q) ||
          (debtor.contact ?? "").toLowerCase().includes(q) ||
          debtor.related_orders.some((order) =>
            order.order_code.toLowerCase().includes(q)
          )
        );
      })
      .sort((a, b) => b.total_balance_cents - a.total_balance_cents);
  }, [records, search]);

  const totalOutstandingCents = useMemo(
    () =>
      debtors.reduce((sum, debtor) => sum + debtor.total_balance_cents, 0),
    [debtors]
  );

  async function markCreditPaymentAsPaid(record: CreditOrderRecord) {
    if (!record.payment) return;
    if (record.balance_due_cents <= 0) return;

    const orderCode = record.order.order_code ?? record.order.id.slice(0, 8);
    const confirmed = confirm(
      `Record repayment for ${orderCode}?\n\nBalance due: ${peso(
        record.balance_due_cents
      )}\n\nThis will mark the payment as paid and clear balance_due_cents.`
    );
    if (!confirmed) return;

    try {
      setUpdatingPaymentId(record.payment.id);
      const now = new Date().toISOString();
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          balance_due_cents: 0,
          paid_at: now,
        })
        .eq("id", record.payment.id);

      if (error) throw error;

      setPayments((prev) =>
        prev.map((payment) =>
          payment.id === record.payment?.id
            ? {
                ...payment,
                status: "paid",
                balance_due_cents: 0,
                paid_at: now,
              }
            : payment
        )
      );
    } catch (err: any) {
      alert(`Failed to record repayment: ${err?.message ?? "Unknown error"}`);
    } finally {
      setUpdatingPaymentId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Credit Orders</h1>
            <p className="mt-1 text-sm text-stone-600">
              Credit-only workspace for outstanding balances and repayments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:bg-amber-50"
            >
              Orders
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Credit Records
            </div>
            <div className="mt-2 text-2xl font-bold text-stone-900">
              {records.length}
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-700">
              <Users className="h-4 w-4" />
              Outstanding Orders
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-900">
              {outstandingCount}
            </div>
            <div className="mt-1 text-xs text-purple-700">
              Settled: {settledCount}
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-100">
              <Wallet className="h-4 w-4" />
              Total Outstanding
            </div>
            <div className="mt-2 text-2xl font-bold">
              {peso(totalOutstandingCents)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order code, customer, contact..."
                className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm sm:w-80"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["outstanding", "all", "settled"] as const).map((filterValue) => (
                <button
                  key={filterValue}
                  onClick={() => setBalanceFilter(filterValue)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                    balanceFilter === filterValue
                      ? "border-purple-700 bg-purple-700 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-purple-300 hover:bg-purple-50"
                  }`}
                >
                  {filterValue}
                </button>
              ))}

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as any)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-700"
              >
                <option value="all">status: all</option>
                <option value="pending">status: pending</option>
                <option value="confirmed">status: confirmed</option>
                <option value="preparing">status: preparing</option>
                <option value="ready">status: ready</option>
                <option value="out_for_delivery">status: out_for_delivery</option>
                <option value="completed">status: completed</option>
                <option value="delivered">status: delivered</option>
                <option value="cancelled">status: cancelled</option>
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as any)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-700"
              >
                <option value="highest_balance">sort: highest balance</option>
                <option value="newest">sort: newest</option>
                <option value="oldest">sort: oldest</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-purple-700" />
            <h2 className="text-sm font-semibold text-stone-900">
              Aggregated Credit / Debtors
            </h2>
          </div>

          {debtors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
              <p className="text-sm font-medium text-stone-700">
                No outstanding credit balances.
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Debtors appear here when balance_due_cents is greater than zero.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {debtors.map((debtor) => (
                <div
                  key={debtor.debtor_key}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-stone-900">
                        {debtor.customer_name}
                      </div>
                      {debtor.contact && (
                        <div className="text-xs text-stone-500">{debtor.contact}</div>
                      )}
                      <div className="mt-1 text-xs text-stone-500">
                        {debtor.total_orders} credit order
                        {debtor.total_orders === 1 ? "" : "s"} · Latest{" "}
                        {new Date(debtor.latest_order_date).toLocaleDateString()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {debtor.related_orders.slice(0, 5).map((relatedOrder) => (
                          <span
                            key={`${debtor.debtor_key}-${relatedOrder.order_id}`}
                            className="rounded-full border border-purple-200 bg-white px-2 py-0.5 text-[11px] font-medium text-purple-700"
                          >
                            {relatedOrder.order_code}
                          </span>
                        ))}
                        {debtor.related_orders.length > 5 && (
                          <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] text-stone-500">
                            +{debtor.related_orders.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-stone-500">
                        Balance Due
                      </div>
                      <div className="text-xl font-bold text-purple-700">
                        {peso(debtor.total_balance_cents)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-stone-700" />
            <h2 className="text-sm font-semibold text-stone-900">
              Credit Orders
            </h2>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
              <p className="text-sm font-medium text-stone-700">
                No credit orders found.
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Try a different search or filter.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <tr className="border-b border-stone-200">
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Customer</th>
                      <th className="py-2 pr-3">Order Status</th>
                      <th className="py-2 pr-3">Payment Status</th>
                      <th className="py-2 pr-3">Total</th>
                      <th className="py-2 pr-3">Balance Due</th>
                      <th className="py-2 pr-3">Created</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.order.id} className="border-b border-stone-100">
                        <td className="py-3 pr-3 font-semibold text-stone-900">
                          {record.order.order_code ?? record.order.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-medium text-stone-900">
                            {record.order.customer_name ?? "Unknown"}
                          </div>
                          <div className="text-xs text-stone-500">
                            {record.order.contact ?? "—"}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-stone-700">
                          {record.order.status ?? "pending"}
                        </td>
                        <td className="py-3 pr-3 text-stone-700">
                          {record.payment?.status ?? "pending"}
                        </td>
                        <td className="py-3 pr-3 font-medium text-stone-900">
                          {peso(record.order.total_cents ?? 0)}
                        </td>
                        <td className="py-3 pr-3 font-semibold text-purple-700">
                          {peso(record.balance_due_cents)}
                        </td>
                        <td className="py-3 pr-3 text-xs text-stone-500">
                          {formatDate(record.order.created_at)}
                        </td>
                        <td className="py-3 text-right">
                          {record.balance_due_cents > 0 ? (
                            record.payment ? (
                              <button
                                disabled={updatingPaymentId === record.payment.id}
                                onClick={() => markCreditPaymentAsPaid(record)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {updatingPaymentId === record.payment.id
                                  ? "Saving..."
                                  : "Record Repayment"}
                              </button>
                            ) : (
                              <span className="text-xs text-amber-700">
                                Missing payment row
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-stone-500">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {filteredRecords.map((record) => (
                  <div
                    key={record.order.id}
                    className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-stone-900">
                          {record.order.order_code ?? record.order.id.slice(0, 8)}
                        </div>
                        <div className="text-sm text-stone-700">
                          {record.order.customer_name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-stone-500">
                          {record.order.contact ?? "—"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-stone-500">
                        {new Date(record.order.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-stone-200 bg-white p-2">
                        <div className="text-stone-500">Order Status</div>
                        <div className="font-medium text-stone-900">
                          {record.order.status ?? "pending"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-white p-2">
                        <div className="text-stone-500">Payment Status</div>
                        <div className="font-medium text-stone-900">
                          {record.payment?.status ?? "pending"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-white p-2">
                        <div className="text-stone-500">Total</div>
                        <div className="font-medium text-stone-900">
                          {peso(record.order.total_cents ?? 0)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-purple-200 bg-white p-2">
                        <div className="text-stone-500">Balance Due</div>
                        <div className="font-semibold text-purple-700">
                          {peso(record.balance_due_cents)}
                        </div>
                      </div>
                    </div>

                    {record.balance_due_cents > 0 ? (
                      record.payment ? (
                        <button
                          disabled={updatingPaymentId === record.payment.id}
                          onClick={() => markCreditPaymentAsPaid(record)}
                          className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {updatingPaymentId === record.payment.id
                            ? "Saving..."
                            : "Record Repayment"}
                        </button>
                      ) : (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
                          Missing payment row
                        </div>
                      )
                    ) : (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">
                        Settled
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
