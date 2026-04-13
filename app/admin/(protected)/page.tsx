import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import DashboardLiveRefresh from "./DashboardLiveRefresh";
import DebtorsSummary from "./DebtorsSummary";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format((cents ?? 0) / 100);
}

type DailyRow = {
  day: string; // date YYYY-MM-DD
  orders_count: number | null;
  revenue_cents: number | null;
  cogs_cents: number | null;
  profit_cents: number | null;
};

function sumRows(rows?: DailyRow[] | null) {
  const r = rows ?? [];
  return {
    orders: r.reduce((s, x) => s + Number(x.orders_count ?? 0), 0),
    revenue: r.reduce((s, x) => s + Number(x.revenue_cents ?? 0), 0),
    cogs: r.reduce((s, x) => s + Number(x.cogs_cents ?? 0), 0),
    profit: r.reduce((s, x) => s + Number(x.profit_cents ?? 0), 0),
  };
}

const TZ = "Asia/Manila";

function ymdInTZ(d: Date, timeZone = TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysYMD(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default async function AdminDashboardPage() {
  const supabase = await supabaseServer();

  const OPEN_STATUSES = ["pending", "confirmed", "preparing", "ready", "out_for_delivery"] as const;

  const { data: openOrders, error: openErr } = await supabase
    .from("orders")
    .select("status")
    .in("status", OPEN_STATUSES);

  if (openErr) console.error("open orders error", openErr);

  const statusCounts = (openOrders ?? []).reduce<Record<string, number>>((acc, r: any) => {
    const k = r.status ?? "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const openCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // ✅ PH-correct "today"
  const today = ymdInTZ(new Date(), TZ);
  const start7 = addDaysYMD(today, -6);

  const { data: realizedRow, error: realizedErr } = await supabase
    .from("daily_profit_realized")
    .select("day, orders_count, revenue_cents, cogs_cents, profit_cents")
    .eq("day", today)
    .maybeSingle();

  if (realizedErr) console.error("realized view error", realizedErr);

  const { data: pipelineRow, error: pipelineErr } = await supabase
    .from("daily_profit_pipeline")
    .select("day, orders_count, revenue_cents, cogs_cents, profit_cents")
    .eq("day", today)
    .maybeSingle();

  if (pipelineErr) console.error("pipeline view error", pipelineErr);

  const realized = (realizedRow ?? null) as DailyRow | null;
  const pipeline = (pipelineRow ?? null) as DailyRow | null;

  const realizedRevenue = Number(realized?.revenue_cents ?? 0);
  const realizedProfit = Number(realized?.profit_cents ?? 0);

  const pipelineRevenue = Number(pipeline?.revenue_cents ?? 0);
  const pipelineProfit = Number(pipeline?.profit_cents ?? 0);

  // ✅ Real 7-day window (calendar days), not "last 7 rows"
  const { data: realized7d, error: realized7dErr } = await supabase
    .from("daily_profit_realized")
    .select("day, orders_count, revenue_cents, cogs_cents, profit_cents")
    .gte("day", start7)
    .lte("day", today)
    .order("day", { ascending: false });

  if (realized7dErr) console.error("realized 7d error", realized7dErr);

  const { data: pipeline7d, error: pipeline7dErr } = await supabase
    .from("daily_profit_pipeline")
    .select("day, orders_count, revenue_cents, cogs_cents, profit_cents")
    .gte("day", start7)
    .lte("day", today)
    .order("day", { ascending: false });

  if (pipeline7dErr) console.error("pipeline 7d error", pipeline7dErr);

  const realizedW = sumRows((realized7d ?? []) as any);
  const pipelineW = sumRows((pipeline7d ?? []) as any);

  const { data: bestSellers, error: bestErr } = await supabase
    .from("top_products_7d_realized")
    .select("product_id, product_name, qty_sold, revenue_cents, cogs_cents, profit_cents")
    .order("profit_cents", { ascending: false })
    .limit(5);

  if (bestErr) console.error("best sellers error", bestErr);

  const { data: lowStock, error: lowErr } = await supabase
    .from("products")
    .select("id, name, stock_qty, is_active")
    .eq("is_active", true)
    .order("stock_qty", { ascending: true })
    .limit(8);

  if (lowErr) console.error("low stock error", lowErr);

  // Service requests pending counts
  const { data: printingPending, error: printingErr } = await supabase
    .from("printing_requests")
    .select("status")
    .in("status", ["pending", "processing"]);
  if (printingErr) console.error("printing pending error", printingErr);

  const { data: gcashPending, error: gcashErr } = await supabase
    .from("gcash_requests")
    .select("status")
    .in("status", ["pending", "processing"]);
  if (gcashErr) console.error("gcash pending error", gcashErr);

  const { data: deliveryPending, error: deliveryErr } = await supabase
    .from("delivery_requests")
    .select("status")
    .in("status", ["pending", "processing", "out_for_delivery"]);
  if (deliveryErr) console.error("delivery pending error", deliveryErr);

  const servicePending = {
    printing: (printingPending ?? []).length,
    gcash: (gcashPending ?? []).length,
    delivery: (deliveryPending ?? []).length,
    total: 0
  };
  servicePending.total = servicePending.printing + servicePending.gcash + servicePending.delivery;

  return (
    <div>
      <DashboardLiveRefresh />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Control Room</h1>
          <p className="mt-1 text-sm text-stone-600">Quick pulse of FDS operations and shortcuts to key workflows.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/orders"
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 text-center"
          >
            📦 Orders
          </Link>
          <Link
            href="/admin/debtors"
            className="rounded-xl border border-purple-200 px-3 py-2 text-sm font-medium text-purple-700 transition hover:border-purple-700 hover:bg-purple-50 text-center"
          >
            💰 Debtors
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Open Orders
          </div>
          <div className="mt-2 text-2xl font-semibold text-stone-900">{openCount}</div>
          <div className="mt-1 text-xs text-stone-500">
            Pending → Out for delivery
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Today Realized Revenue
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-900">{peso(realizedRevenue)}</div>
          <div className="mt-1 text-xs text-amber-700">
            Profit: {peso(realizedProfit)}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Today Pipeline Revenue
          </div>
          <div className="mt-2 text-2xl font-semibold text-stone-900">{peso(pipelineRevenue)}</div>
          <div className="mt-1 text-xs text-stone-500">
            Est. Profit: {peso(pipelineProfit)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Realized (Last 7 days)
          </div>
          <div className="mt-2 text-xl font-semibold text-amber-900">{peso(realizedW.revenue)}</div>
          <div className="mt-1 text-xs text-amber-700">
            Profit: {peso(realizedW.profit)} · Orders: {realizedW.orders}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Pipeline (Last 7 days)
          </div>
          <div className="mt-2 text-xl font-semibold text-stone-900">{peso(pipelineW.revenue)}</div>
          <div className="mt-1 text-xs text-stone-500">
            Est. Profit: {peso(pipelineW.profit)} · Orders: {pipelineW.orders}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-stone-900">Open order statuses</div>
          <Link href="/admin/orders" className="text-sm text-amber-700 transition hover:text-amber-800 hover:underline">
            Open Orders
          </Link>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {OPEN_STATUSES.map((k) => (
            <div key={k} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {k.replaceAll("_", " ")}
              </div>
              <div className="mt-1 text-xl font-semibold text-stone-900">{statusCounts[k] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-stone-900">Best sellers (last 7 days, realized)</div>
          <Link href="/admin/products" className="text-sm text-amber-700 transition hover:text-amber-800 hover:underline">
            Products
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-stone-500">
              <tr className="border-b border-stone-200">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Revenue</th>
                <th className="py-2 pr-2">Profit</th>
              </tr>
            </thead>
            <tbody>
              {(bestSellers ?? []).map((r: any) => (
                <tr key={r.product_id} className="border-b border-stone-200 last:border-b-0">
                  <td className="py-2 pr-2 font-medium text-stone-900">{r.product_name}</td>
                  <td className="py-2 pr-2 text-stone-700">{Number(r.qty_sold ?? 0)}</td>
                  <td className="py-2 pr-2 text-stone-700">{peso(Number(r.revenue_cents ?? 0))}</td>
                  <td className="py-2 pr-2 font-semibold text-amber-800">{peso(Number(r.profit_cents ?? 0))}</td>
                </tr>
              ))}
              {!bestSellers?.length && (
                <tr>
                  <td className="py-3 text-stone-600" colSpan={4}>
                    No paid sales yet in the last 7 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-stone-900">Low stock</div>
          <Link href="/admin/products" className="text-sm text-amber-700 transition hover:text-amber-800 hover:underline">
            Go to Products
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-stone-500">
              <tr className="border-b border-stone-200">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Stock</th>
                <th className="py-2 pr-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {(lowStock ?? []).map((p: any) => (
                <tr key={p.id} className="border-b border-stone-200 last:border-b-0">
                  <td className="py-2 pr-2 font-medium text-stone-900">{p.name}</td>
                  <td className="py-2 pr-2 text-stone-700">{p.stock_qty}</td>
                  <td className="py-2 pr-2 text-stone-700">{p.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
              {!lowStock?.length && (
                <tr>
                  <td className="py-3 text-stone-600" colSpan={3}>
                    No products found (or stock data not available yet).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Requests Overview */}
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-stone-900">Service Requests Overview</div>
          {servicePending.total > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
              {servicePending.total} pending
            </span>
          )}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Link href="/admin/printing" className="rounded-xl border border-stone-200 bg-stone-50 p-3 transition hover:border-amber-700 hover:bg-amber-50">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Printing</div>
              {servicePending.printing > 0 && (
                <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {servicePending.printing}
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-stone-600">Print, copy & scan</div>
          </Link>
          <Link href="/admin/gcash" className="rounded-xl border border-stone-200 bg-stone-50 p-3 transition hover:border-amber-700 hover:bg-amber-50">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">GCash</div>
              {servicePending.gcash > 0 && (
                <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {servicePending.gcash}
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-stone-600">Cash in & out</div>
          </Link>
          <Link href="/admin/deliveries" className="rounded-xl border border-stone-200 bg-stone-50 p-3 transition hover:border-amber-700 hover:bg-amber-50">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Delivery</div>
              {servicePending.delivery > 0 && (
                <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {servicePending.delivery}
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-stone-600">Off-campus delivery</div>
          </Link>
        </div>
      </div>

      {/* Credit / Debtors Summary (D2) */}
      <DebtorsSummary />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Link href="/admin/products" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-amber-700 hover:bg-amber-50">
          <div className="font-semibold text-stone-900">Products</div>
          <div className="text-sm text-stone-600">Inventory and pricing</div>
        </Link>
        <Link href="/admin/orders" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-amber-700 hover:bg-amber-50">
          <div className="font-semibold text-stone-900">Orders</div>
          <div className="text-sm text-stone-600">Workflow and payments</div>
        </Link>
        <Link href="/admin/offers" className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm transition hover:border-amber-700 hover:bg-amber-50">
          <div className="font-semibold text-stone-900">Offers</div>
          <div className="text-sm text-stone-600">Promotions & deals</div>
        </Link>
        <Link href="/admin/settings" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-amber-700 hover:bg-amber-50">
          <div className="font-semibold text-stone-900">Settings</div>
          <div className="text-sm text-stone-600">Landing + wizard config</div>
        </Link>
      </div>
    </div>
  );
}
