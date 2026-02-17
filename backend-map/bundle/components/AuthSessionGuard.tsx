"use client";

import { useEffect } from "react";
import { AuthApiError } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser";

function clearSupabaseLocalStorage() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith("sb-") ||
        k.includes("supabase") ||
        k.includes("auth-token") ||
        k.includes("supabase.auth")
      ) {
        keys.push(k);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export default function AuthSessionGuard() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const supabase = supabaseBrowser();
        const { error } = await supabase.auth.getSession();

        if (error) {
          const msg = (error as any)?.message?.toLowerCase?.() ?? "";

          if (
            error instanceof AuthApiError &&
            msg.includes("invalid refresh token")
          ) {
            // Clean reset: clear client storage + sign out, then refresh
            clearSupabaseLocalStorage();
            await supabase.auth.signOut();

            if (!cancelled) {
              window.location.reload();
            }
          }
        }
      } catch {
        // swallow: guard should never crash UI
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
