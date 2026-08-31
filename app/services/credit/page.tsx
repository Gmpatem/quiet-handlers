import { Metadata } from "next";
import CreditServiceClient, { CreditProduct } from "@/components/credit/CreditServiceClient";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Take on Credit | Tenpesorun",
  description: "Pick what you need. Pay later at Room 411.",
};

export default async function CreditServicePage() {
  let products: CreditProduct[] = [];

  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, price_cents, stock_qty, is_active, photo_url, badge_text")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(100);

    if (!error && data) {
      products = data as CreditProduct[];
    }
  } catch (err) {
    console.error("Credit service products fetch exception:", err);
  }

  return <CreditServiceClient initialProducts={products} />;
}
