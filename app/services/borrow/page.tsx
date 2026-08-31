import { Metadata } from "next";
import BorrowServiceClient from "@/components/borrow/BorrowServiceClient";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Borrow Here | Tenpesorun",
  description: "Borrow today, return tomorrow.",
};

export default async function BorrowServicePage() {
  const supabase = await supabaseServer();
  const { data: items } = await supabase
    .from("products")
    .select("id, name, stock_qty")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return <BorrowServiceClient initialItems={items ?? []} />;
}
