import { supabaseServer } from "@/lib/supabaseServer";
import OrdersClient, { OrderRow, PaymentRow } from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = await supabaseServer();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_code, customer_name, contact, notes, fulfillment, pickup_location, delivery_fee_cents, delivery_location, payment_method, subtotal_cents, total_cents, status, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Orders</h1>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-semibold text-red-800">Failed to load orders</div>
              <p className="mt-1 text-sm text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const orderIds = (orders ?? []).map((o: any) => o.id);

  let payments: PaymentRow[] = [];
  if (orderIds.length) {
    const { data: pays } = await supabase
      .from("payments")
      .select("id, order_id, method, amount_cents, reference_number, status, created_at")
      .in("order_id", orderIds);

    payments = (pays ?? []) as any;
  }

  return <OrdersClient initialOrders={(orders ?? []) as any} initialPayments={payments} />;
}
