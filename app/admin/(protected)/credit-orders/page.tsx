import { supabaseServer } from "@/lib/supabaseServer";
import CreditOrdersClient, {
  CreditOrderRow,
  CreditPaymentRow,
} from "./CreditOrdersClient";

export const dynamic = "force-dynamic";

const ORDER_SELECT =
  "id, order_code, customer_name, contact, status, total_cents, created_at, updated_at, payment_method";
const PAYMENT_SELECT =
  "id, order_id, method, amount_cents, balance_due_cents, reference_number, gcash_ref, proof_url, status, paid_at, created_at";

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const ORDER_ID_CHUNK_SIZE = 200;

async function fetchAllCreditPayments(supabase: any): Promise<CreditPaymentRow[]> {
  const rows: CreditPaymentRow[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("payments")
      .select(PAYMENT_SELECT)
      .eq("method", "credit")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as CreditPaymentRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

async function fetchAllCreditOrdersByMethod(
  supabase: any
): Promise<CreditOrderRow[]> {
  const rows: CreditOrderRow[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("payment_method", "credit")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as CreditOrderRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

async function fetchOrdersByIds(
  supabase: any,
  orderIds: string[]
): Promise<CreditOrderRow[]> {
  if (orderIds.length === 0) return [];

  const rows: CreditOrderRow[] = [];
  for (let start = 0; start < orderIds.length; start += ORDER_ID_CHUNK_SIZE) {
    const chunk = orderIds.slice(start, start + ORDER_ID_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .in("id", chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as CreditOrderRow[]));
  }

  return rows;
}

export default async function CreditOrdersPage() {
  const supabase = await supabaseServer();

  let creditPayments: CreditPaymentRow[] = [];
  let ordersByMethod: CreditOrderRow[] = [];

  try {
    [creditPayments, ordersByMethod] = await Promise.all([
      fetchAllCreditPayments(supabase),
      fetchAllCreditOrdersByMethod(supabase),
    ]);
  } catch (err: any) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Credit Orders</h1>
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to load credit data: {err?.message ?? "Unknown error"}
        </p>
      </div>
    );
  }

  const ordersMap = new Map<string, CreditOrderRow>();
  for (const order of ordersByMethod) {
    ordersMap.set(order.id, order);
  }

  const paymentOrderIds = Array.from(
    new Set((creditPayments ?? []).map((row) => row.order_id))
  );
  const missingOrderIds = paymentOrderIds.filter((id) => !ordersMap.has(id));

  if (missingOrderIds.length > 0) {
    try {
      const ordersFromPayments = await fetchOrdersByIds(supabase, missingOrderIds);
      for (const order of ordersFromPayments) {
        ordersMap.set(order.id, order);
      }
    } catch (err: any) {
      return (
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Credit Orders</h1>
          <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Failed to load credit orders: {err?.message ?? "Unknown error"}
          </p>
        </div>
      );
    }
  }

  const orders = Array.from(ordersMap.values()).sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at))
  );
  const payments = [...creditPayments].sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at))
  );

  return (
    <CreditOrdersClient
      initialOrders={orders}
      initialPayments={payments}
    />
  );
}
