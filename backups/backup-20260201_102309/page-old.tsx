import { supabaseServer } from "@/lib/supabaseServer";
import { getPublicSettings } from "@/lib/publicSettings";
import Storefront from "@/components/store/Storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await supabaseServer();
  const settings = await getPublicSettings();

  return (
    <main className="min-h-screen">
      {/* Ultra Compact Header */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Logo Only - No Text Repetition */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stone-600 to-amber-900 text-xs font-bold text-white shadow-sm">
              FDS
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-2">
              {/* Print Button */}
              <a
                href="https://forms.gle/KBhZ8Et4fqdG7g5y5"
                target="_blank"
                rel="noreferrer"
                className="touch-target flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 active:scale-95"
                title="Print Service"
                aria-label="Print Service"
              >
                <span className="text-base">🖨️</span>
              </a>

              {/* Admin Button */}
              <a
                href="/admin"
                className="touch-target flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 active:scale-95"
                title="Admin"
                aria-label="Admin"
              >
                <span className="text-base">⚙️</span>
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
