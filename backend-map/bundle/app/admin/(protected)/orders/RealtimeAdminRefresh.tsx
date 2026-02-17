"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Debounced refresh to avoid UI storms when many rows update.
 * Safe to mount in AdminShell (or per-page).
 */
export default function RealtimeAdminRefresh() {
  const router = useRouter();
  const t = useRef<any>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();

    const schedule = () => {
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => router.refresh(), 700);
    };

    const channel = supabase
      .channel("admin-live-refresh")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, schedule)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payments" }, schedule)
      // Optional: keep order_items for order totals changes (still debounced)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_items" }, schedule)
      .subscribe();

    return () => {
      if (t.current) clearTimeout(t.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
