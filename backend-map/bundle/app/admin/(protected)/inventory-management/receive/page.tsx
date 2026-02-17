import { supabaseServer } from "@/lib/supabaseServer";
import ReceiveInventoryClient from "./ReceiveInventoryClient";

export const dynamic = "force-dynamic";

export default async function ReceiveInventoryPage() {
  const supabase = await supabaseServer();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category, price_cents, cost_cents, stock_qty, is_active, photo_url")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Inventory Reception</h1>
        <p className="mt-2 text-sm text-red-600">Failed to load products: {error.message}</p>
      </div>
    );
  }

  return <ReceiveInventoryClient products={(products ?? []) as any[]} />;
}
