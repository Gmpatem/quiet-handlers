import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, Home } from "lucide-react";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

export default async function OrderSuccessPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await supabaseServer();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_code,
      customer_name,
      fulfillment,
      pickup_location,
      delivery_location,
      payment_method,
      total_cents
    `
    )
    .eq("order_code", code)
    .single();

  if (error || !order) return notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("name_snapshot, qty, line_total_cents")
    .eq("order_id", order.id)
    .order("name_snapshot", { ascending: true });

  const orderItems = items ?? [];

  const pickupLocationLabel =
    order.pickup_location === "boys_411"
      ? "Boys Dorm (Room 411)"
      : order.pickup_location === "girls_206"
        ? "Girls Dorm (Room 206)"
        : order.pickup_location || "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50/30 to-white">
      {/* Compact Header */}
      <header className="border-b border-stone-200/70 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-stone-600 to-amber-900 text-xs font-bold text-white">
                FDS
              </div>
              <span className="text-sm font-semibold text-stone-900">Final Destination Services</span>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 sm:py-6">
        {/* Compact Success Card */}
        <Card className="overflow-hidden shadow-lg">
          <CardContent className="space-y-4 p-4 sm:p-6">
            {/* Success Message + Order Code */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-stone-900">Order Placed!</h2>
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-2 text-xl font-bold tracking-wide text-amber-900">
                {order.order_code}
              </div>
              <p className="mt-2 text-xs text-stone-500">Save this code</p>
            </div>

            {/* Divider */}
            <div className="h-px bg-stone-200" />

            {/* Quick Info Grid */}
            <div className="grid gap-3 text-sm">
              {/* Customer */}
              <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
                <span className="text-stone-600">Customer</span>
                <span className="font-semibold text-stone-900">{order.customer_name}</span>
              </div>

              {/* Pickup Location */}
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-700" />
                  <span className="text-amber-700">Pickup</span>
                </div>
                <span className="font-semibold text-amber-900">{pickupLocationLabel}</span>
              </div>

              {/* Payment */}
              <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
                <span className="text-stone-600">Payment</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {order.payment_method === "gcash" ? "GCash" : "Cash"}
                </Badge>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-stone-200" />

            {/* Items - Compact List */}
            <div>
              <div className="mb-2 text-xs font-semibold text-stone-600">
                Items ({orderItems.length})
              </div>
              <div className="space-y-1.5">
                {orderItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">
                      {item.qty}× {item.name_snapshot}
                    </span>
                    <span className="font-semibold tabular-nums text-stone-900">
                      {peso(item.line_total_cents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
              <span className="font-semibold text-stone-900">Total</span>
              <span className="text-lg font-bold text-amber-900">{peso(order.total_cents)}</span>
            </div>

            {/* Divider */}
            <div className="h-px bg-stone-200" />

            {/* Compact Suggestions */}
            <div>
              <label htmlFor="suggestions" className="mb-1.5 block text-xs font-semibold text-stone-600">
                Suggestions? (optional)
              </label>
              <textarea
                id="suggestions"
                placeholder="Help us improve..."
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                rows={2}
              />
            </div>

            {/* Action Button */}
            <Button
              asChild
              className="w-full touch-target bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950"
              size="lg"
            >
              <Link href="/" className="flex items-center justify-center gap-2">
                <Home className="h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="mt-4 text-center text-xs text-stone-500">
          Questions? Contact us at the pickup location.
        </p>
      </div>
    </div>
  );
}
