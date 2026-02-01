import { supabaseServer } from "@/lib/supabaseServer";
import { getPublicSettings } from "@/lib/publicSettings";
import Storefront from "@/components/store/Storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await supabaseServer();
  const settings = await getPublicSettings();

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Storefront handles its own header now */}
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
