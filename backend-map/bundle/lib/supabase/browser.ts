import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

function parseCookieString(cookieStr: string) {
  if (!cookieStr) return [];
  return cookieStr
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf("=");
      const name = idx >= 0 ? pair.slice(0, idx) : pair;
      const value = idx >= 0 ? pair.slice(idx + 1) : "";
      return { name, value };
    });
}

export function supabaseBrowser() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  client = createBrowserClient(url, key, {
    cookies: {
      getAll() {
        return parseCookieString(typeof document !== "undefined" ? document.cookie : "");
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;

        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = options ?? {};
          const parts = [`${name}=${value}`];

          // minimal, safe cookie write
          parts.push(`Path=${opts.path ?? "/"}`);
          if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
          if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
          if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
          if (opts.secure) parts.push("Secure");

          document.cookie = parts.join("; ");
        });
      },
    },
  });

  return client;
}

/**
 * Optional: call this once on app boot to self-heal stale refresh tokens.
 * It will sign out + reload if it detects "Invalid Refresh Token".
 */
export async function healInvalidRefreshToken() {
  try {
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.getSession();

    const msg = (error as any)?.message?.toLowerCase?.() ?? "";
    if (msg.includes("invalid refresh token")) {
      // clear common localStorage leftovers
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
      } catch {}

      await supabase.auth.signOut();
      window.location.reload();
    }
  } catch {
    // never crash UI from auth healing
  }
}
