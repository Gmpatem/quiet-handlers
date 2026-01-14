import { supabaseServer } from "@/lib/supabaseServer";
import { getPublicSettings } from "@/lib/publicSettings";
import Storefront from "@/components/store/Storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await supabaseServer();
  const settings = await getPublicSettings();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category, price_cents, stock_qty, is_active, photo_url")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <Storefront
      settings={settings}
      products={(products ?? []) as any}
      productsError={error?.message ?? null}
    />
  );
}
