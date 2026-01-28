import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import DashboardLiveRefresh from "./DashboardLiveRefresh";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format((cents ?? 0) / 100);
}

type DailyRow = {
  day: string; // date
  orders_count: number | null;
  revenue_cents: number | null;
  cogs_cents: number | null;
  profit_cents: number | null;
};

type TopProductRow = {
  product_id: string;
  product_name: string;
  qty_sold: number | null;
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

export default async function AdminDashboardPage() {
  const supabase = await supabaseServer();

  // ✅ Correct column name: orders.status (not order_status)
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

  // ✅ Pull today realized + pipeline from views
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

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

  // ✅ Weekly (last 7 days): pull 7 most recent rows from each view
  const { data: realized7d, error: realized7dErr } = await supabase
    .from("daily_profit_realized")
    .select("day, orders_count, revenue_cents, cogs_cents, profit_cents")
    .order("day", { ascending: false })
    .limit(7);

  if (realized7dErr) console.error("realized 7d error", realized7dErr);

  const { data: pipeline7d, error: pipeline7dErr } = await supabase
    .from("daily_profit_pipeline")
    .select("day, orders_count, revenue_cents, cogs_cents, profit_cents")
    .order("day", { ascending: false })
    .limit(7);

  if (pipeline7dErr) console.error("pipeline 7d error", pipeline7dErr);

  const realizedW = sumRows((realized7d ?? []) as any);
  const pipelineW = sumRows((pipeline7d ?? []) as any);

  // ✅ Best sellers (realized, last 7 days) from view
  const { data: bestSellers, error: bestErr } = await supabase
    .from("top_products_7d_realized")
    .select("product_id, product_name, qty_sold, revenue_cents, cogs_cents, profit_cents")
    .order("profit_cents", { ascending: false })
    .limit(5);

  if (bestErr) console.error("best sellers error", bestErr);

  // Low stock (unchanged)
  const { data: lowStock, error: lowErr } = await supabase
    .from("products")
    .select("id, name, stock_qty, is_active")
    .eq("is_active", true)
    .order("stock_qty", { ascending: true })
    .limit(8);

  if (lowErr) console.error("low stock error", lowErr);

  return (
    <div>
      {/* ✅ This makes the whole dashboard auto-refresh on DB changes */}
      <DashboardLiveRefresh />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Quick pulse of TenPesoRun operations.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/admin/orders"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 text-center"
          >
            View Orders
          </Link>
          <Link
            href="/admin/products"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 text-center"
          >
            Manage Products
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open Orders
          </div>
          <div className="mt-2 text-2xl font-semibold">{openCount}</div>
          <div className="mt-1 text-xs text-slate-500">
            Pending → Out for delivery
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Today Realized Revenue
          </div>
          <div className="mt-2 text-2xl font-semibold">{peso(realizedRevenue)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Profit: {peso(realizedProfit)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Today Pipeline Revenue
          </div>
          <div className="mt-2 text-2xl font-semibold">{peso(pipelineRevenue)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Est. Profit: {peso(pipelineProfit)}
          </div>
        </div>
      </div>

      {/* Weekly summary cards */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Realized (Last 7 days)
          </div>
          <div className="mt-2 text-xl font-semibold">{peso(realizedW.revenue)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Profit: {peso(realizedW.profit)} · Orders: {realizedW.orders}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pipeline (Last 7 days)
          </div>
          <div className="mt-2 text-xl font-semibold">{peso(pipelineW.revenue)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Est. Profit: {peso(pipelineW.profit)} · Orders: {pipelineW.orders}
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Open order statuses</div>
          <Link href="/admin/orders" className="text-sm text-slate-600 hover:underline">
            Open Orders
          </Link>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {OPEN_STATUSES.map((k) => (
            <div key={k} className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {k.replaceAll("_", " ")}
              </div>
              <div className="mt-1 text-xl font-semibold">{statusCounts[k] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Best sellers */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Best sellers (last 7 days, realized)</div>
          <Link href="/admin/products" className="text-sm text-slate-600 hover:underline">
            Products
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Revenue</th>
                <th className="py-2 pr-2">Profit</th>
              </tr>
            </thead>
            <tbody>
              {(bestSellers ?? []).map((r: any) => (
                <tr key={r.product_id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 font-medium">{r.product_name}</td>
                  <td className="py-2 pr-2">{Number(r.qty_sold ?? 0)}</td>
                  <td className="py-2 pr-2">{peso(Number(r.revenue_cents ?? 0))}</td>
                  <td className="py-2 pr-2">{peso(Number(r.profit_cents ?? 0))}</td>
                </tr>
              ))}
              {!bestSellers?.length && (
                <tr>
                  <td className="py-3 text-slate-600" colSpan={4}>
                    No paid sales yet in the last 7 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low stock */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Low stock</div>
          <Link href="/admin/products" className="text-sm text-slate-600 hover:underline">
            Go to Products
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Stock</th>
                <th className="py-2 pr-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {(lowStock ?? []).map((p: any) => (
                <tr key={p.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 font-medium">{p.name}</td>
                  <td className="py-2 pr-2">{p.stock_qty}</td>
                  <td className="py-2 pr-2">{p.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
              {!lowStock?.length && (
                <tr>
                  <td className="py-3 text-slate-600" colSpan={3}>
                    No products found (or stock data not available yet).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/admin/products" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
          <div className="font-semibold">Products</div>
          <div className="text-sm text-slate-600">Inventory and pricing</div>
        </Link>
        <Link href="/admin/orders" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
          <div className="font-semibold">Orders</div>
          <div className="text-sm text-slate-600">Workflow and payments</div>
        </Link>
        <Link href="/admin/settings" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
          <div className="font-semibold">Settings</div>
          <div className="text-sm text-slate-600">Landing + wizard config</div>
        </Link>
      </div>
    </div>
  );
}
