import { supabaseServer } from "@/lib/supabaseServer";
import { getPublicSettings } from "@/lib/publicSettings";
import Storefront from "@/components/store/Storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await supabaseServer();
  const settings = await getPublicSettings();

  return (
    <main className="min-h-screen">
      {/* Responsive Header */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:py-3 lg:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo + Branding */}
            <div className="flex items-center gap-3">
              {/* Brown Badge Logo */}
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-900 to-amber-950 text-xs font-bold text-white shadow-sm sm:h-12 sm:w-12 lg:h-14 lg:w-14 sm:text-sm lg:text-base">
                FDS
              </div>

              {/* Full Text - Hidden on Mobile */}
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-stone-900 sm:text-lg lg:text-xl">
                  Final Destination Services
                </h1>
                <p className="text-xs text-stone-600 sm:text-sm">
                  Handling things. Quietly
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Print Button - Icon on Mobile, Text on Tablet+ */}
              <a
                href="https://forms.gle/KBhZ8Et4fqdG7g5y5"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 active:scale-95 sm:h-10 sm:px-4 lg:h-11"
                title="Print Service"
                aria-label="Print Service"
              >
                <span className="text-base sm:text-lg">🖨️</span>
                <span className="hidden text-sm font-medium sm:inline">Print Service</span>
              </a>

              {/* Admin Button - Icon on Mobile, Text on Tablet+ */}
              <a
                href="/admin"
                className="flex h-9 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 active:scale-95 sm:h-10 sm:px-4 lg:h-11"
                title="Admin"
                aria-label="Admin"
              >
                <span className="text-base sm:text-lg">⚙️</span>
                <span className="hidden text-sm font-medium sm:inline">Admin Panel</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Storefront */}
      <Storefront settings={settings} products={[] as any} productsError={null} />

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-50/60 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-stone-600 sm:text-sm">
            Final Destination Services - Campus convenience, handled quietly.
          </p>
        </div>
      </footer>
    </main>
  );
}
