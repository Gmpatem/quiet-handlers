"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Listens to Postgres changes and refreshes the current route.
 * This keeps the Server Component dashboard always up to date.
 */
export default function DashboardLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseBrowser();

    const channel = supabase
      .channel("dashboard-live-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
