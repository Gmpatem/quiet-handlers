import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format((cents ?? 0) / 100);
}

export default async function AdminDashboardPage() {
  const supabase = await supabaseServer();

  // Open order statuses (adjust these strings if your enum differs)
  const OPEN_STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery"];

  const { data: openOrders } = await supabase
    .from("orders")
    .select("order_status")
    .in("order_status", OPEN_STATUSES);

  const statusCounts = (openOrders ?? []).reduce<Record<string, number>>((acc, r: any) => {
    const k = r.order_status ?? "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const openCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Revenue / Profit from order_items snapshots
  const { data: items } = await supabase
    .from("order_items")
    .select("qty, unit_price_cents, unit_cost_cents, line_total_cents");

  let revenueCents = 0;
  let profitCents = 0;

  for (const it of items ?? []) {
    const qty = Number((it as any).qty ?? 0);
    const unitPrice = Number((it as any).unit_price_cents ?? 0);
    const unitCost = Number((it as any).unit_cost_cents ?? 0);
    const lineTotal = Number((it as any).line_total_cents ?? qty * unitPrice);

    revenueCents += lineTotal;
    profitCents += qty * (unitPrice - unitCost);
  }

  // Low stock
  const { data: lowStock } = await supabase
    .from("products")
    .select("id, name, stock_qty, is_active")
    .eq("is_active", true)
    .order("stock_qty", { ascending: true })
    .limit(8);

  return (
    <div>
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
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Revenue
          </div>
          <div className="mt-2 text-2xl font-semibold">{peso(revenueCents)}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estimated Profit
          </div>
          <div className="mt-2 text-2xl font-semibold">{peso(profitCents)}</div>
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

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
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

      {/* Quick links (no Login card anymore) */}
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
