"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, ShoppingBasket, TrendingUp, Receipt, RefreshCw } from "lucide-react";

type ReportParams = {
  date_range: "today" | "yesterday" | "last_7_days" | "last_30_days" | "this_month" | "last_month" | "custom";
  start_at?: string;
  end_at?: string;
  timezone?: string;

  fulfillment: "all" | "pickup" | "delivery";
  payment_method: "all" | "cod" | "gcash" | "credit";
  paid_only: boolean;

  status: "all" | "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled" | "delivered";
  top_n: number;
};

type KPI = {
  orders_count: number;
  gross_revenue_cents: number;
  paid_revenue_cents: number;
  items_sold: number;
  aov_cents: number;
};

type TrendPoint = { date: string; revenue_cents: number; orders_count: number };

type TopClientRow = {
  client_key: string;
  customer_name: string | null;
  contact: string | null;
  orders_count: number;
  total_spent_cents: number;
  last_order_at: string | null;
};

type TopProductRow = {
  name_snapshot: string;
  qty_sold: number;
  revenue_cents: number;
  profit_cents: number;
};

type StatusCountRow = { status: string; count: number };

type OrderRow = {
  id: string;
  order_code: string | null;
  customer_name: string | null;
  contact: string | null;
  status: string | null;
  fulfillment: string | null;
  payment_method: string | null;
  total_cents: number | null;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  name_snapshot: string;
  unit_price_cents: number;
  qty: number;
  line_total_cents: number;
};

type ReportPayload = {
  params: ReportParams;
  kpis: KPI;
  trend: TrendPoint[];
  topClients: TopClientRow[];
  topProducts: TopProductRow[];
  statusCounts: StatusCountRow[];
  orders: OrderRow[];
  itemsByOrderId: Record<string, OrderItemRow[]>;
};

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

function toInputDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDayLocal(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDayLocal(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function iso(d: Date) {
  return d.toISOString();
}

function defaultParams(): ReportParams {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endOfDayLocal(now);

  return {
    date_range: "this_month",
    start_at: iso(start),
    end_at: iso(end),
    timezone: "Asia/Manila",
    fulfillment: "all",
    payment_method: "all",
    paid_only: false,
    status: "all",
    top_n: 10,
  };
}

export default function ReportsClient() {
  const [params, setParams] = useState<ReportParams>(defaultParams());
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load(p: ReportParams) {
    setLoading(true);
    setSelectedOrderId(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      });

      // If your API route is missing, Next returns an HTML 404 page.
      // This prevents the "Unexpected token '<'" JSON error.
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`API did not return JSON. Status=${res.status}. First chars: ${text.slice(0, 80)}`);
      }

      const json = (await res.json()) as { ok: boolean; payload?: ReportPayload; error?: string };
      if (!json.ok || !json.payload) throw new Error(json.error ?? "Failed to load report");
      setData(json.payload);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    const orders = data?.orders ?? [];
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const code = (o.order_code ?? "").toLowerCase();
      const name = (o.customer_name ?? "").toLowerCase();
      const contact = (o.contact ?? "").toLowerCase();
      const id = o.id.toLowerCase();
      return code.includes(q) || name.includes(q) || contact.includes(q) || id.includes(q);
    });
  }, [data, orderSearch]);

  const selectedItems = useMemo(() => {
    if (!data || !selectedOrderId) return [];
    return data.itemsByOrderId[selectedOrderId] ?? [];
  }, [data, selectedOrderId]);

  function applyDatePreset(next: ReportParams["date_range"]) {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (next === "today") {
      start = startOfDayLocal(now);
      end = endOfDayLocal(now);
    } else if (next === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = startOfDayLocal(y);
      end = endOfDayLocal(y);
    } else if (next === "last_7_days") {
      end = endOfDayLocal(now);
      start = startOfDayLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    } else if (next === "last_30_days") {
      end = endOfDayLocal(now);
      start = startOfDayLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
    } else if (next === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = endOfDayLocal(now);
    } else if (next === "last_month") {
      const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthEnd = new Date(firstThisMonth.getTime() - 1);
      start = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
      end = endOfDayLocal(lastMonthEnd);
    } else {
      setParams((prev) => ({ ...prev, date_range: "custom" }));
      return;
    }

    setParams((prev) => ({
      ...prev,
      date_range: next,
      start_at: iso(start),
      end_at: iso(end),
    }));
  }

  const k = data?.kpis;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white p-3 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-stone-900">Reports</h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600">
              Sales, top clients, top products, and ops status in one place.
            </p>
          </div>

          <button
            onClick={() => load(params)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 active:scale-[0.99]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Error box (prevents “blank page mystery”) */}
        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="font-extrabold">Reports API error</div>
            <div className="mt-1 text-red-700">{errorMsg}</div>
            <div className="mt-2 text-xs text-red-600">
              Check that <span className="font-mono">app/api/admin/reports/route.ts</span> exists and returns JSON.
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "custom"] as const).map((dr) => (
                <button
                  key={dr}
                  onClick={() => applyDatePreset(dr)}
                  className={`rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-semibold ${
                    params.date_range === dr ? "border-amber-700 bg-amber-700 text-white" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {dr.replaceAll("_", " ")}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              <div className={`${params.date_range === "custom" ? "" : "opacity-60"}`}>
                <label className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Start</label>
                <input
                  type="date"
                  value={toInputDate(params.start_at)}
                  onChange={(e) => {
                    const d = e.target.value;
                    const start = d ? startOfDayLocal(new Date(d + "T00:00:00")) : undefined;
                    setParams((prev) => ({
                      ...prev,
                      date_range: "custom",
                      start_at: start ? iso(start) : undefined,
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs sm:text-sm"
                />
              </div>

              <div className={`${params.date_range === "custom" ? "" : "opacity-60"}`}>
                <label className="text-[10px] font-bold uppercase tracking-wide text-stone-500">End</label>
                <input
                  type="date"
                  value={toInputDate(params.end_at)}
                  onChange={(e) => {
                    const d = e.target.value;
                    const end = d ? endOfDayLocal(new Date(d + "T00:00:00")) : undefined;
                    setParams((prev) => ({
                      ...prev,
                      date_range: "custom",
                      end_at: end ? iso(end) : undefined,
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Fulfillment</label>
                <select
                  value={params.fulfillment}
                  onChange={(e) => setParams((prev) => ({ ...prev, fulfillment: e.target.value as any }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="all">All</option>
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Payment</label>
                <select
                  value={params.payment_method}
                  onChange={(e) => setParams((prev) => ({ ...prev, payment_method: e.target.value as any }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="all">All</option>
                  <option value="cod">COD</option>
                  <option value="gcash">GCash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Status</label>
                <select
                  value={params.status}
                  onChange={(e) => setParams((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="all">All</option>
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="preparing">preparing</option>
                  <option value="ready">ready</option>
                  <option value="out_for_delivery">out_for_delivery</option>
                  <option value="completed">completed</option>
                  <option value="delivered">delivered</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={params.paid_only}
                    onChange={(e) => setParams((prev) => ({ ...prev, paid_only: e.target.checked }))}
                  />
                  Paid only
                </label>
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => load(params)}
              className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-800 active:scale-[0.99]"
            >
              Apply
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={<Receipt className="h-5 w-5" />} label="Orders" value={k ? String(k.orders_count) : "—"} />
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Gross revenue" value={k ? peso(k.gross_revenue_cents) : "—"} />
          <KpiCard icon={<Users className="h-5 w-5" />} label="Paid revenue" value={k ? peso(k.paid_revenue_cents) : "—"} />
          <KpiCard icon={<ShoppingBasket className="h-5 w-5" />} label="Items sold" value={k ? String(k.items_sold) : "—"} sub={k ? `AOV: ${peso(k.aov_cents)}` : ""} />
        </div>

        {/* Trend + Status */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-sm font-extrabold text-stone-900">Revenue trend</div>
              <div className="text-xs text-stone-500">Daily totals</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="py-2">Date</th>
                    <th className="py-2">Orders</th>
                    <th className="py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.trend ?? []).map((t) => (
                    <tr key={t.date} className="border-t border-stone-100">
                      <td className="py-2 font-semibold text-stone-900">{t.date}</td>
                      <td className="py-2 text-stone-700">{t.orders_count}</td>
                      <td className="py-2 font-bold text-stone-900">{peso(t.revenue_cents)}</td>
                    </tr>
                  ))}
                  {(data?.trend ?? []).length === 0 && (
                    <tr>
                      <td className="py-6 text-sm text-stone-500" colSpan={3}>
                        No data in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-sm font-extrabold text-stone-900">Status snapshot</div>
              <div className="text-xs text-stone-500">Counts by order status</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.statusCounts ?? []).map((s) => (
                    <tr key={s.status} className="border-t border-stone-100">
                      <td className="py-2 font-semibold text-stone-800">{s.status}</td>
                      <td className="py-2 text-right font-extrabold text-stone-900">{s.count}</td>
                    </tr>
                  ))}
                  {(data?.statusCounts ?? []).length === 0 && (
                    <tr>
                      <td className="py-6 text-sm text-stone-500" colSpan={2}>
                        No status data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Clients + Top Products */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-sm font-extrabold text-stone-900">Top buying clients</div>
              <div className="text-xs text-stone-500">Ranked by total spent</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="py-2">Client</th>
                    <th className="py-2">Orders</th>
                    <th className="py-2">Spent</th>
                    <th className="py-2">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topClients ?? []).map((c) => (
                    <tr key={c.client_key} className="border-t border-stone-100">
                      <td className="py-2">
                        <div className="font-bold text-stone-900">{c.customer_name ?? "Unknown"}</div>
                        <div className="text-xs text-stone-500">{c.contact ?? "—"}</div>
                      </td>
                      <td className="py-2 text-stone-700">{c.orders_count}</td>
                      <td className="py-2 font-extrabold text-stone-900">{peso(c.total_spent_cents)}</td>
                      <td className="py-2 text-xs text-stone-500">{c.last_order_at ? new Date(c.last_order_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {(data?.topClients ?? []).length === 0 && (
                    <tr>
                      <td className="py-6 text-sm text-stone-500" colSpan={4}>
                        No clients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-sm font-extrabold text-stone-900">Top products</div>
              <div className="text-xs text-stone-500">Based on order_items snapshots</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="py-2">Product</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Revenue</th>
                    <th className="py-2">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topProducts ?? []).map((p) => (
                    <tr key={p.name_snapshot} className="border-t border-stone-100">
                      <td className="py-2 font-semibold text-stone-900">{p.name_snapshot}</td>
                      <td className="py-2 text-stone-700">{p.qty_sold}</td>
                      <td className="py-2 font-bold text-stone-900">{peso(p.revenue_cents)}</td>
                      <td className="py-2 font-bold text-emerald-700">{peso(p.profit_cents)}</td>
                    </tr>
                  ))}
                  {(data?.topProducts ?? []).length === 0 && (
                    <tr>
                      <td className="py-6 text-sm text-stone-500" colSpan={4}>
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Orders + receipt */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-extrabold text-stone-900">Orders</div>
              <div className="text-xs text-stone-500">Click an order to view itemized receipt</div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search orders..."
                className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm sm:w-72"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="py-2">Order</th>
                    <th className="py-2">Customer</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      className={`cursor-pointer border-t border-stone-100 hover:bg-stone-50 ${
                        selectedOrderId === o.id ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="py-2 font-extrabold text-stone-900">{o.order_code ?? o.id.slice(0, 8)}</td>
                      <td className="py-2">
                        <div className="font-semibold text-stone-900">{o.customer_name ?? "—"}</div>
                        <div className="text-xs text-stone-500">{o.contact ?? "—"}</div>
                      </td>
                      <td className="py-2 text-stone-700">{o.status ?? "pending"}</td>
                      <td className="py-2 font-bold text-stone-900">{peso(o.total_cents ?? 0)}</td>
                      <td className="py-2 text-xs text-stone-500">{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td className="py-6 text-sm text-stone-500" colSpan={5}>
                        No orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-2 text-sm font-extrabold text-stone-900">Itemized receipt</div>
              {!selectedOrderId ? (
                <div className="text-sm text-stone-600">Select an order to view items.</div>
              ) : (
                <>
                  <div className="mb-2 text-xs text-stone-600">
                    Order:{" "}
                    <span className="font-bold text-stone-900">
                      {data?.orders.find((o) => o.id === selectedOrderId)?.order_code ?? selectedOrderId.slice(0, 8)}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                    {selectedItems.map((it) => (
                      <div key={it.id} className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3">
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 truncate">{it.name_snapshot}</div>
                          <div className="text-xs text-stone-500">
                            {it.qty} × {peso(it.unit_price_cents)}
                          </div>
                        </div>
                        <div className="font-extrabold text-stone-900">{peso(it.line_total_cents)}</div>
                      </div>
                    ))}
                    {selectedItems.length === 0 && <div className="text-sm text-stone-600">No items found for this order.</div>}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3">
                    <span className="text-sm font-semibold text-stone-700">Items total</span>
                    <span className="text-sm font-extrabold text-stone-900">
                      {peso(selectedItems.reduce((sum, x) => sum + (x.line_total_cents ?? 0), 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="fixed bottom-4 right-4 rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            Loading report…
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-2 text-stone-800">{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{label}</div>
          <div className="mt-0.5 text-xl font-extrabold text-stone-900 truncate">{value}</div>
          {sub ? <div className="mt-0.5 text-xs text-stone-500">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}
