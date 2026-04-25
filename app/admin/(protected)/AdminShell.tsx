"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-sm"
          : "text-stone-700 hover:bg-stone-100",
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
  const [authChecked, setAuthChecked] = useState(false);
  const isOrdersWorkspace = pathname?.startsWith("/admin/orders");

  // ✅ PACK F: CLEAN NAVIGATION STRUCTURE
  // Grouped by operational workflow for better discoverability
  const mainNav = useMemo(
    () => [
      { href: "/admin", label: "Dashboard", icon: "🏠" },
      { href: "/admin/orders", label: "Orders", icon: "📦" },
      { href: "/admin/credit-orders", label: "Credit Orders", icon: "💳" },
    ],
    []
  );

  const catalogNav = useMemo(
    () => [
      { href: "/admin/products", label: "Products", icon: "🛍️" },
      { href: "/admin/inventory-management", label: "Inventory", icon: "📊" },
      { href: "/admin/offers", label: "Offers", icon: "🎁" },
    ],
    []
  );

  const servicesNav = useMemo(
    () => [
      { href: "/admin/printing", label: "Printing", icon: "🖨️" },
      { href: "/admin/gcash", label: "GCash", icon: "💳" },
      { href: "/admin/deliveries", label: "Delivery", icon: "🚚" },
    ],
    []
  );

  const adminNav = useMemo(
    () => [
      { href: "/admin/reports", label: "Reports", icon: "📈" },
      { href: "/admin/settings", label: "Settings", icon: "⚙️" },
    ],
    []
  );

  // ✅ Client guard (verified auth) – avoids relying on getSession().user
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const supabase = supabaseBrowser();

        // This contacts Supabase Auth to validate the user (more secure than session.user from storage)
        const { data, error } = await supabase.auth.getUser();

        if (cancelled) return;

        if (error || !data.user) {
          router.replace("/admin/login");
          router.refresh();
          return;
        }

        setAuthChecked(true);
      } catch {
        if (!cancelled) {
          router.replace("/admin/login");
          router.refresh();
        }
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

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

  // Optional: tiny loader so the UI doesn’t flash for a split second
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30">
      <div
        className={`mx-auto grid grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[240px_1fr] ${
          isOrdersWorkspace ? "max-w-none" : "max-w-6xl"
        }`}
      >
        <aside>
          <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-stone-200 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-stone-600 to-amber-900 text-xs font-bold text-white shadow-sm">
                FDS
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-900">Admin Panel</div>
                <div className="text-xs text-stone-500">FDS Management</div>
              </div>
            </div>

            {/* Main Operations */}
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Operations
            </div>
            <nav className="mb-4 grid gap-1">
              {mainNav.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname?.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={`${item.icon} ${item.label}`}
                    active={!!active}
                  />
                );
              })}
            </nav>

            {/* Catalog & Merchandising */}
            <div className="mb-2 border-t border-stone-200 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Catalog
            </div>
            <nav className="mb-4 grid gap-1">
              {catalogNav.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={`${item.icon} ${item.label}`}
                    active={!!active}
                  />
                );
              })}
            </nav>

            {/* Services */}
            <div className="mb-2 border-t border-stone-200 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Services
            </div>
            <nav className="mb-4 grid gap-1">
              {servicesNav.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={`${item.icon} ${item.label}`}
                    active={!!active}
                  />
                );
              })}
            </nav>

            {/* Admin */}
            <div className="mb-2 border-t border-stone-200 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Admin
            </div>
            <nav className="grid gap-1">
              {adminNav.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={`${item.icon} ${item.label}`}
                    active={!!active}
                  />
                );
              })}
            </nav>

            <button
              onClick={onLogout}
              disabled={signingOut}
              className="mt-4 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
            >
              {signingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </aside>

        <main className="min-w-0">
          {isOrdersWorkspace ? (
            <div className="min-h-full">{children}</div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
