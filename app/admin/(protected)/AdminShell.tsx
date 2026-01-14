"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function NavItem({ href, label, active }: any) {
  return (
    <Link
      href={href}
      className={[
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const nav = useMemo(
    () => [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/products", label: "Products" },
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/settings", label: "Settings" },
    ],
    []
  );

  async function onLogout() {
    setSigningOut(true);
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      router.push("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Navigation
            </div>
            <nav className="grid gap-1">
              {nav.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname?.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={!!active}
                  />
                );
              })}
            </nav>

            <button
              onClick={onLogout}
              disabled={signingOut}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {signingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
