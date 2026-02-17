import { supabaseServer } from "@/lib/supabaseServer";
import InventoryManagementClient from "./InventoryManagementClient";

export const dynamic = "force-dynamic";

type BatchRow = {
  batch_id: string;
  batch_code: string;
  created_at: string;
  note: string | null;
  distinct_products: number | null;
  total_units_received: number | null;
  total_cost_cents: number | null;
};

type LineRow = {
  batch_id: string;
  batch_code: string;
  product_id: string;
  product_name: string;
  qty_received: number;
  qty_remaining: number;
  unit_cost_cents: number;
  category: string | null;
  price_cents: number | null;
};

export default async function InventoryManagementPage() {
  const supabase = await supabaseServer();

  // Grab recent batches first (keeps page fast)
  const { data: batches, error: bErr } = await supabase
    .from("inventory_batches_admin")
    .select("batch_id, batch_code, created_at, note, distinct_products, total_units_received, total_cost_cents")
    .order("created_at", { ascending: false })
    .limit(60);

  if (bErr) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Inventory Management</h1>
        <p className="mt-2 text-sm text-red-600">Failed to load batches: {bErr.message}</p>
      </div>
    );
  }

  const batchIds = (batches ?? []).map((b: any) => b.batch_id).filter(Boolean);

  // Pull lines for those batches, joined to products for category + price
  // NOTE: This assumes your inventory_batch_lines_admin view includes product_id and batch_id.
  const { data: rawLines, error: lErr } = await supabase
    .from("inventory_batch_lines_admin")
    .select("batch_id, batch_code, product_id, product_name, qty_received, qty_remaining, unit_cost_cents, products:product_id(category, price_cents)")
    .in("batch_id", batchIds)
    .limit(8000);

  if (lErr) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Inventory Management</h1>
        <p className="mt-2 text-sm text-red-600">Failed to load batch lines: {lErr.message}</p>
      </div>
    );
  }

  const lines: LineRow[] =
    (rawLines ?? []).map((r: any) => ({
      batch_id: r.batch_id,
      batch_code: r.batch_code,
      product_id: r.product_id,
      product_name: r.product_name,
      qty_received: r.qty_received ?? 0,
      qty_remaining: r.qty_remaining ?? 0,
      unit_cost_cents: r.unit_cost_cents ?? 0,
      category: r.products?.category ?? null,
      price_cents: r.products?.price_cents ?? null,
    })) ?? [];

  return (
    <InventoryManagementClient
      batches={(batches ?? []) as BatchRow[]}
      lines={lines}
    />
  );
}
