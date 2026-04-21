import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type ReportParams = {
  date_range:
    | "today"
    | "yesterday"
    | "last_7_days"
    | "last_30_days"
    | "this_month"
    | "last_month"
    | "custom";
  start_at?: string; // ISO
  end_at?: string; // ISO
  timezone?: string;

  fulfillment: "all" | "pickup" | "delivery";
  payment_method: "all" | "cod" | "gcash" | "credit";
  paid_only: boolean;

  status:
    | "all"
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "completed"
    | "cancelled"
    | "delivered";

  top_n: number;
};

type KPI = {
  orders_count: number;
  gross_revenue_cents: number;
  paid_revenue_cents: number;
  items_sold: number;
  aov_cents: number;
};

type TrendPoint = {
  date: string; // YYYY-MM-DD
  revenue_cents: number;
  orders_count: number;
};

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

type OpsSnapshot = {
  fulfillmentCounts: { pickup: number; delivery: number; other: number };
  paymentCounts: { cod: number; gcash: number; credit: number; other: number };
  paidRatePct: number; // 0..100 (1 decimal)
  cancelRatePct: number; // 0..100 (1 decimal)
  avgItemsPerOrder: number; // 1 decimal
  peakHours: Array<{ hour: number; orders_count: number; revenue_cents: number }>; // top 8 hours
};

type Alerts = {
  stalePending: number; // pending >= 15m
  staleConfirmed: number; // confirmed >= 30m
  unpaidConfirmed: number; // confirmed but not paid-like
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

  // ✅ new
  ops: OpsSnapshot;
  alerts: Alerts;
};

function clampTopN(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 10;
  return Math.max(1, Math.min(50, Math.floor(x)));
}

function safeIso(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// YYYY-MM-DD in a specific timezone
function ymdInTz(isoString: string, tz: string) {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function hourInTz(isoString: string, tz: string) {
  const d = new Date(isoString);
  const hh = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  }).format(d);
  const h = Number(hh);
  return Number.isFinite(h) ? h : 0;
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

function isPaidLike(p: { status?: string | null; paid_at?: string | null } | null | undefined) {
  if (!p) return false;
  if ((p as any).paid_at) return true;
  const s = (p.status ?? "").toLowerCase();
  return ["paid", "completed", "confirmed", "success", "succeeded", "verified"].includes(s);
}

const ALLOWED_FULFILLMENT = new Set<ReportParams["fulfillment"]>([
  "all",
  "pickup",
  "delivery",
]);
const ALLOWED_PAYMENT_METHOD = new Set<ReportParams["payment_method"]>([
  "all",
  "cod",
  "gcash",
  "credit",
]);
const ALLOWED_ORDER_STATUS = new Set<ReportParams["status"]>([
  "all",
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
  "delivered",
]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReportParams;

    const timezone = body.timezone || "Asia/Manila";
    const start_at = safeIso(body.start_at) ?? new Date(0).toISOString();
    const end_at = safeIso(body.end_at) ?? new Date().toISOString();

    const params: ReportParams = {
      date_range: body.date_range ?? "custom",
      start_at,
      end_at,
      timezone,
      fulfillment: ALLOWED_FULFILLMENT.has(body.fulfillment)
        ? body.fulfillment
        : "all",
      payment_method: ALLOWED_PAYMENT_METHOD.has(body.payment_method)
        ? body.payment_method
        : "all",
      paid_only: Boolean(body.paid_only),
      status: ALLOWED_ORDER_STATUS.has(body.status) ? body.status : "all",
      top_n: clampTopN(body.top_n),
    };

    const supabase = await supabaseServer();

    // 1) Pull orders (filtered)
    let ordersQ = supabase
      .from("orders")
      .select("id, order_code, customer_name, contact, status, fulfillment, payment_method, total_cents, created_at")
      .gte("created_at", params.start_at!)
      .lte("created_at", params.end_at!)
      .order("created_at", { ascending: false });

    if (params.fulfillment !== "all") ordersQ = ordersQ.eq("fulfillment", params.fulfillment);
    if (params.payment_method !== "all") ordersQ = ordersQ.eq("payment_method", params.payment_method);
    if (params.status !== "all") ordersQ = ordersQ.eq("status", params.status);

    const { data: ordersRaw, error: ordersErr } = await ordersQ;
    if (ordersErr) throw new Error(ordersErr.message);

    const orders: OrderRow[] = (ordersRaw ?? []) as any;
    const orderIds = orders.map((o) => o.id);

    // If no orders, return empty payload fast
    if (orderIds.length === 0) {
      const empty: ReportPayload = {
        params,
        kpis: { orders_count: 0, gross_revenue_cents: 0, paid_revenue_cents: 0, items_sold: 0, aov_cents: 0 },
        trend: [],
        topClients: [],
        topProducts: [],
        statusCounts: [],
        orders: [],
        itemsByOrderId: {},
        ops: {
          fulfillmentCounts: { pickup: 0, delivery: 0, other: 0 },
          paymentCounts: { cod: 0, gcash: 0, credit: 0, other: 0 },
          paidRatePct: 0,
          cancelRatePct: 0,
          avgItemsPerOrder: 0,
          peakHours: [],
        },
        alerts: { stalePending: 0, staleConfirmed: 0, unpaidConfirmed: 0 },
      };
      return NextResponse.json({ ok: true, payload: empty });
    }

    // 2) Pull items for these orders
    const { data: itemsRaw, error: itemsErr } = await supabase
      .from("order_items")
      .select("id, order_id, name_snapshot, unit_price_cents, unit_cost_cents, qty, line_total_cents")
      .in("order_id", orderIds);

    if (itemsErr) throw new Error(itemsErr.message);

    const itemsAll = (itemsRaw ?? []) as Array<OrderItemRow & { unit_cost_cents?: number | null }>;

    // 3) Payments (for paid_only + paid revenue + ops alerts)
    const { data: paysRaw, error: paysErr } = await supabase
      .from("payments")
      .select("order_id, status, paid_at")
      .in("order_id", orderIds);

    const payments = paysErr ? [] : ((paysRaw ?? []) as any[]);
    const paidMap = new Map<string, boolean>();
    for (const p of payments) {
      const prev = paidMap.get(p.order_id) ?? false;
      paidMap.set(p.order_id, prev || isPaidLike(p));
    }

    // 4) paid_only filter
    let finalOrders = orders;
    if (params.paid_only) {
      finalOrders = orders.filter((o) => paidMap.get(o.id) === true);
    }
    const finalOrderIds = new Set(finalOrders.map((o) => o.id));

    const finalItemsAll = itemsAll.filter((it) => finalOrderIds.has(it.order_id));

    const finalItemsByOrderId: Record<string, OrderItemRow[]> = {};
    for (const it of finalItemsAll) {
      (finalItemsByOrderId[it.order_id] ||= []).push({
        id: it.id,
        order_id: it.order_id,
        name_snapshot: it.name_snapshot,
        unit_price_cents: it.unit_price_cents,
        qty: it.qty,
        line_total_cents: it.line_total_cents,
      });
    }

    // ---- Aggregations ----

    // KPI
    const orders_count = finalOrders.length;
    const gross_revenue_cents = finalOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
    const paid_revenue_cents = finalOrders.reduce((s, o) => (paidMap.get(o.id) ? s + (o.total_cents ?? 0) : s), 0);
    const items_sold = finalItemsAll.reduce((s, it) => s + (it.qty ?? 0), 0);
    const aov_cents = orders_count > 0 ? Math.round(gross_revenue_cents / orders_count) : 0;

    const kpis: KPI = { orders_count, gross_revenue_cents, paid_revenue_cents, items_sold, aov_cents };

    // Trend (daily)
    const trendMap = new Map<string, { revenue_cents: number; orders_count: number }>();
    for (const o of finalOrders) {
      const day = ymdInTz(o.created_at, timezone);
      const prev = trendMap.get(day) ?? { revenue_cents: 0, orders_count: 0 };
      prev.revenue_cents += o.total_cents ?? 0;
      prev.orders_count += 1;
      trendMap.set(day, prev);
    }
    const trend: TrendPoint[] = [...trendMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({ date, revenue_cents: v.revenue_cents, orders_count: v.orders_count }));

    // Status counts
    const statusCountMap = new Map<string, number>();
    for (const o of finalOrders) {
      const st = (o.status ?? "pending") as string;
      statusCountMap.set(st, (statusCountMap.get(st) ?? 0) + 1);
    }
    const statusCounts: StatusCountRow[] = [...statusCountMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count }));

    // Top clients (group by contact+name)
    const clientMap = new Map<
      string,
      {
        customer_name: string | null;
        contact: string | null;
        orders_count: number;
        total_spent_cents: number;
        last_order_at: string | null;
      }
    >();

    for (const o of finalOrders) {
      const key = `${o.contact ?? ""}|${o.customer_name ?? ""}`.trim() || o.id;
      const prev =
        clientMap.get(key) ?? {
          customer_name: o.customer_name ?? null,
          contact: o.contact ?? null,
          orders_count: 0,
          total_spent_cents: 0,
          last_order_at: null,
        };

      prev.orders_count += 1;
      prev.total_spent_cents += o.total_cents ?? 0;

      if (!prev.last_order_at || new Date(o.created_at) > new Date(prev.last_order_at)) {
        prev.last_order_at = o.created_at;
      }

      prev.customer_name = prev.customer_name ?? o.customer_name ?? null;
      prev.contact = prev.contact ?? o.contact ?? null;

      clientMap.set(key, prev);
    }

    const topClients: TopClientRow[] = [...clientMap.entries()]
      .map(([client_key, v]) => ({ client_key, ...v }))
      .sort((a, b) => b.total_spent_cents - a.total_spent_cents)
      .slice(0, params.top_n);

    // Top products (by name_snapshot)
    const prodMap = new Map<string, { qty_sold: number; revenue_cents: number; profit_cents: number }>();
    for (const it of finalItemsAll) {
      const name = it.name_snapshot ?? "Unknown";
      const prev = prodMap.get(name) ?? { qty_sold: 0, revenue_cents: 0, profit_cents: 0 };
      prev.qty_sold += it.qty ?? 0;
      prev.revenue_cents += it.line_total_cents ?? 0;

      const unitCost = (it as any).unit_cost_cents ?? 0;
      prev.profit_cents += (it.line_total_cents ?? 0) - unitCost * (it.qty ?? 0);

      prodMap.set(name, prev);
    }

    const topProducts: TopProductRow[] = [...prodMap.entries()]
      .map(([name_snapshot, v]) => ({ name_snapshot, ...v }))
      .sort((a, b) => b.revenue_cents - a.revenue_cents)
      .slice(0, params.top_n);

    // ✅ Ops snapshot + alerts
    const fulfillmentCounts = { pickup: 0, delivery: 0, other: 0 };
    const paymentCounts = { cod: 0, gcash: 0, credit: 0, other: 0 };

    for (const o of finalOrders) {
      const f = (o.fulfillment ?? "").toLowerCase();
      if (f === "pickup") fulfillmentCounts.pickup++;
      else if (f === "delivery") fulfillmentCounts.delivery++;
      else fulfillmentCounts.other++;

      const pm = (o.payment_method ?? "").toLowerCase();
      if (pm === "cod" || pm === "cash") paymentCounts.cod++;
      else if (pm === "gcash") paymentCounts.gcash++;
      else if (pm === "credit") paymentCounts.credit++;
      else paymentCounts.other++;
    }

    const paidOrdersCount = finalOrders.reduce((s, o) => s + (paidMap.get(o.id) ? 1 : 0), 0);
    const cancelledCount = finalOrders.reduce(
      (s, o) => s + (((o.status ?? "").toLowerCase() === "cancelled") ? 1 : 0),
      0
    );

    const paidRatePct = orders_count ? round1((paidOrdersCount / orders_count) * 100) : 0;
    const cancelRatePct = orders_count ? round1((cancelledCount / orders_count) * 100) : 0;

    const totalQty = finalItemsAll.reduce((s, it) => s + (it.qty ?? 0), 0);
    const avgItemsPerOrder = orders_count ? round1(totalQty / orders_count) : 0;

    const hourMap = new Map<number, { orders_count: number; revenue_cents: number }>();
    for (const o of finalOrders) {
      const hour = hourInTz(o.created_at, timezone);
      const prev = hourMap.get(hour) ?? { orders_count: 0, revenue_cents: 0 };
      prev.orders_count += 1;
      prev.revenue_cents += o.total_cents ?? 0;
      hourMap.set(hour, prev);
    }
    const peakHours = [...hourMap.entries()]
      .map(([hour, v]) => ({ hour, ...v }))
      .sort((a, b) => b.orders_count - a.orders_count)
      .slice(0, 8);

    const nowMs = Date.now();
    const ageMins = (iso: string) => Math.floor((nowMs - new Date(iso).getTime()) / 60000);

    const stalePending = finalOrders.filter(
      (o) => ((o.status ?? "pending") === "pending") && ageMins(o.created_at) >= 15
    ).length;

    const staleConfirmed = finalOrders.filter(
      (o) => ((o.status ?? "") === "confirmed") && ageMins(o.created_at) >= 30
    ).length;

    const unpaidConfirmed = finalOrders.filter(
      (o) => ((o.status ?? "") === "confirmed") && !paidMap.get(o.id)
    ).length;

    const ops: OpsSnapshot = {
      fulfillmentCounts,
      paymentCounts,
      paidRatePct,
      cancelRatePct,
      avgItemsPerOrder,
      peakHours,
    };

    const alerts: Alerts = { stalePending, staleConfirmed, unpaidConfirmed };

    const payload: ReportPayload = {
      params,
      kpis,
      trend,
      topClients,
      topProducts,
      statusCounts,
      orders: finalOrders,
      itemsByOrderId: finalItemsByOrderId,
      ops,
      alerts,
    };

    return NextResponse.json({ ok: true, payload });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
