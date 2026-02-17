import { supabaseServer } from "@/lib/supabaseServer";
import { getPublicSettings } from "@/lib/publicSettings";
import Storefront from "@/components/store/Storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await supabaseServer();
  const settings = await getPublicSettings();

  // Fetch initial products server-side for better performance
  let initialProducts: any[] = [];
  let productsError: string | null = null;

  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, price_cents, stock_qty, is_active, photo_url")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(100); // Increased limit to ensure all categories appear

    if (error) {
      productsError = error.message;
      console.error("Products fetch error:", error);
    } else {
      initialProducts = data || [];
      console.log(`Loaded ${initialProducts.length} initial products for categories`);
    }
  } catch (error: any) {
    productsError = error?.message || "Failed to load products";
    console.error("Products fetch exception:", error);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Storefront component handles its own header and content */}
      <Storefront 
        settings={settings} 
        products={initialProducts} 
        productsError={productsError} 
      />

      {/* Enhanced Footer - Hidden on mobile since Storefront has bottom cart button */}
      <footer className="hidden lg:block border-t border-stone-200 bg-gradient-to-b from-white to-stone-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-semibold text-stone-900">Final Destination Services</h3>
              <p className="mt-1 text-xs text-stone-600 sm:text-sm">
                Campus convenience, handled quietly.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <a 
                href="/terms" 
                className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
              >
                Terms of Service
              </a>
              <a 
                href="/privacy" 
                className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
              >
                Privacy Policy
              </a>
              <a 
                href="/contact" 
                className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
              >
                Contact Us
              </a>
              <a 
                href="/admin" 
                className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
              >
                Admin
              </a>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-stone-500">
              © {new Date().getFullYear()} Final Destination Services. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile-optimized footer */}
      <footer className="lg:hidden border-t border-stone-200 bg-gradient-to-b from-white to-stone-50 pt-6 pb-20 px-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold text-stone-900">Final Destination Services</h3>
          <p className="mt-1 text-xs text-stone-600">
            Campus convenience, handled quietly.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a 
              href="/terms" 
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              Terms
            </a>
            <span className="text-xs text-stone-300">•</span>
            <a 
              href="/privacy" 
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              Privacy
            </a>
            <span className="text-xs text-stone-300">•</span>
            <a 
              href="/contact" 
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              Contact
            </a>
            <span className="text-xs text-stone-300">•</span>
            <a 
              href="/admin" 
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              Admin
            </a>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-stone-500">
              © {new Date().getFullYear()} FDS
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}