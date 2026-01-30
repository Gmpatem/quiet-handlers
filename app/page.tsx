import { supabaseServer } from "@/lib/supabaseServer";
import { getPublicSettings } from "@/lib/publicSettings";
import Storefront from "@/components/store/Storefront";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await supabaseServer();
  const settings = await getPublicSettings();

  return (
    <main className="min-h-screen pb-12">
      {/* FDS Header with Navigation */}
      <header className="sticky top-0 z-50 border-b border-stone-200/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-stone-600 to-amber-900 font-bold text-white shadow-md sm:h-12 sm:w-12">
                FDS
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-stone-900 sm:text-xl">
                  Final Destination Services
                </h1>
                <p className="text-xs text-stone-600 sm:text-sm">Handling things. Quietly</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="outline"
                size="default"
                asChild
                className="gap-2 border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                <a
                  href="https://forms.gle/KBhZ8Et4fqdG7g5y5"
                  target="_blank"
                  rel="noreferrer"
                >
                  Printing Services
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>

              <Button
                variant="default"
                size="default"
                asChild
                className="bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950"
              >
                <Link href="/admin">
                  Admin Panel
                </Link>
              </Button>
            </div>

            {/* Mobile Navigation */}
            <div className="flex items-center gap-2 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-stone-300 text-stone-700"
              >
                <a
                  href="https://forms.gle/KBhZ8Et4fqdG7g5y5"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs"
                >
                  Print
                </a>
              </Button>

              <Button
                size="sm"
                asChild
                className="bg-gradient-to-r from-amber-700 to-amber-900 text-xs text-white hover:from-amber-800 hover:to-amber-950"
              >
                <Link href="/admin">
                  Admin
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl py-6 sm:py-8 lg:py-12">
        <Storefront settings={settings} products={[] as any} productsError={null} />
      </div>

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
