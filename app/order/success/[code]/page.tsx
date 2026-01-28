import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function pickupLabel(value?: string | null) {
  if (!value) return null;
  if (value === "boys_411") return "Boys Dorm – Room 411";
  if (value === "girls_206") return "Girls Dorm – Room 206";
  return value; // fallback (future-proof)
}

export default async function SuccessPage(props: {
  params: Promise<{ code?: string }>;
}) {
  const { code = "" } = await props.params;
  const supabase = await supabaseServer();

  const { data: order } = await supabase
    .from("orders")
    .select("fulfillment, pickup_location")
    .eq("order_code", code)
    .maybeSingle();

  const pickupText =
    order?.fulfillment === "pickup"
      ? pickupLabel(order?.pickup_location)
      : null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-9">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Order received ✅
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Thank you! We’ll start packing it now.
                </p>
              </div>
              <div className="hidden sm:block rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm">
                TenPesoRun
              </div>
            </div>

            {/* Order code */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">
                Your order code
              </div>
              <div className="mt-1 text-lg font-semibold tracking-wide text-slate-900">
                {code || "—"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Tip: screenshot this code so it’s easy to show later.
              </div>
            </div>

            {/* Pickup info (ONLY if pickup) */}
            {pickupText && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Pickup location
                </div>
                <div className="mt-1 text-sm font-semibold text-emerald-900">
                  {pickupText}
                </div>
                <div className="mt-1 text-xs text-emerald-700">
                  Please bring your order code when picking up.
                </div>
              </div>
            )}

            {/* Delivery info */}
            {order?.fulfillment === "delivery" && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Delivery
                </div>
                <div className="mt-1 text-sm font-semibold text-blue-900">
                  We’ll deliver this to your location shortly.
                </div>
              </div>
            )}

            <div className="mt-5 text-sm text-slate-600">
              If you enjoyed TenPesoRun, share it with a classmate or your roommate.
            </div>

            <div className="mt-8 grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold shadow-sm hover:bg-slate-50"
              >
                Back to store
              </Link>
              <Link
                href="/checkout"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                New order
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/60 p-4 text-center text-xs text-slate-500">
            Campus snacks, fast and simple.
          </div>
        </div>
      </div>
    </div>
  );
}
