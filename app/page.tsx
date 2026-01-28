import { supabaseServer } from "@/lib/supabaseServer";
import { getPublicSettings } from "@/lib/publicSettings";
import Storefront from "@/components/store/Storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await supabaseServer(); // keep if you rely on server env init; otherwise can remove
  const settings = await getPublicSettings();

  return (
    <Storefront
      settings={settings}
      products={[] as any}
      productsError={null}
    />
  );
}
