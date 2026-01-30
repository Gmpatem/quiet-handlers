import { supabaseServer } from "@/lib/supabaseServer";
import InventoryManagementClient from "../inventory-management/InventoryManagementClient";

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

export default async function AdminInventoryPage() {
  const supabase = await supabaseServer();

  // 1) Fetch batches
  const { data: rawBatches, error: bErr } = await supabase
    .from("inventory_batches")
    .select("id, batch_code, created_at, note")
    .order("created_at", { ascending: false })
    .limit(200);

  if (bErr) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Inventory</h1>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load inventory batches: {bErr.message}
        </div>
      </div>
    );
  }

  const batchRows = (rawBatches ?? []) as any[];
  const batchIds = batchRows.map((b) => b.id);

  const batchCodeById = new Map<string, string>();
  for (const b of batchRows) batchCodeById.set(b.id, b.batch_code);

  // 2) Fetch lots
  const { data: rawLots, error: lErr } = await supabase
    .from("inventory_lots")
    .select("batch_id, product_id, qty_received, qty_remaining, unit_cost_cents")
    .in("batch_id", batchIds.length ? batchIds : ["00000000-0000-0000-0000-000000000000"]);

  if (lErr) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Inventory</h1>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load inventory lots: {lErr.message}
        </div>
      </div>
    );
  }

  const lots = (rawLots ?? []) as any[];

  // 3) Fetch products used in those lots
  const productIds = Array.from(new Set(lots.map((x) => x.product_id).filter(Boolean)));

  const { data: rawProducts, error: pErr } = await supabase
    .from("products")
    .select("id, name, category, price_cents")
    .in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);

  if (pErr) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Inventory</h1>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load products for inventory: {pErr.message}
        </div>
      </div>
    );
  }

  const productById = new Map<string, any>();
  for (const p of rawProducts ?? []) productById.set((p as any).id, p);

  // 4) Build lines (category-first UI comes from client component)
  const lines: LineRow[] = lots.map((l) => {
    const p = productById.get(l.product_id);
    return {
      batch_id: l.batch_id,
      batch_code: batchCodeById.get(l.batch_id) ?? "BATCH",
      product_id: l.product_id,
      product_name: p?.name ?? "Unknown product",
      qty_received: Number(l.qty_received ?? 0),
      qty_remaining: Number(l.qty_remaining ?? 0),
      unit_cost_cents: Number(l.unit_cost_cents ?? 0),
      category: p?.category ?? null,
      price_cents: p?.price_cents ?? null,
    };
  });

  // 5) Compute batch aggregates (so client can show totals)
  const agg = new Map<
    string,
    { products: Set<string>; units: number; cost: number }
  >();

  for (const l of lines) {
    const a = agg.get(l.batch_id) ?? { products: new Set(), units: 0, cost: 0 };
    a.products.add(l.product_id);
    a.units += l.qty_received;
    a.cost += l.qty_received * l.unit_cost_cents;
    agg.set(l.batch_id, a);
  }

  const batches: BatchRow[] = batchRows.map((b) => {
    const a = agg.get(b.id) ?? { products: new Set(), units: 0, cost: 0 };
    return {
      batch_id: b.id,
      batch_code: b.batch_code,
      created_at: b.created_at,
      note: b.note ?? null,
      distinct_products: a.products.size,
      total_units_received: a.units,
      total_cost_cents: a.cost,
    };
  });

  return <InventoryManagementClient batches={batches} lines={lines} />;
}

