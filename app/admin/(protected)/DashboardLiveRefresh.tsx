"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Listens to Postgres changes and refreshes the current route.
 * Tuned for stability (avoid jitter during burst updates).
 */
export default function DashboardLiveRefresh() {
  const router = useRouter();
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, 800);
    };

    const channel = supabase
      .channel("dashboard-live-refresh")
      // Orders + payments are the core truth for dashboard stats
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payments" }, scheduleRefresh)
      // Products only affects low stock card; keep update-only
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
