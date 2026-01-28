"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Subscribes to changes and refreshes the current route.
 * Put this once in AdminShell so all admin pages stay live.
 */
export default function RealtimeAdminRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseBrowser();

    // One channel, multiple table listeners
    const channel = supabase
      .channel("admin-live-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
