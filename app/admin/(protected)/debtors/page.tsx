import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import { ArrowLeft, Users, Wallet, AlertCircle, Package } from "lucide-react";

export const dynamic = "force-dynamic";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

interface DebtorSummary {
  customer_name: string;
  total_owed: number;
  order_count: number;
  last_order_date: string;
  order_ids: string[];
}

export default async function DebtorsPage() {
  const supabase = await supabaseServer();

  // Fetch all credit payments with balance due
  const { data: creditPayments, error } = await supabase
    .from("payments")
    .select(`
      id,
      order_id,
      amount_cents,
      balance_due_cents,
      created_at,
      orders!inner(id, order_code, customer_name, created_at, status)
    `)
    .eq("method", "credit")
    .gt("balance_due_cents", 0)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-bold text-stone-900">Debtors</h1>
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="font-semibold text-red-800">Failed to load debtors</div>
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Aggregate by customer
  const debtorMap = new Map<string, DebtorSummary>();
  
  (creditPayments ?? []).forEach((payment: any) => {
    const customerName = payment.orders?.customer_name ?? "Unknown";
    const existing = debtorMap.get(customerName);
    
    if (existing) {
      existing.total_owed += payment.balance_due_cents ?? 0;
      existing.order_count += 1;
      existing.order_ids.push(payment.order_id);
      if (payment.created_at > existing.last_order_date) {
        existing.last_order_date = payment.created_at;
      }
    } else {
      debtorMap.set(customerName, {
        customer_name: customerName,
        total_owed: payment.balance_due_cents ?? 0,
        order_count: 1,
        last_order_date: payment.created_at,
        order_ids: [payment.order_id],
      });
    }
  });

  const debtors = Array.from(debtorMap.values()).sort((a, b) => b.total_owed - a.total_owed);
  const totalOwed = debtors.reduce((sum, d) => sum + d.total_owed, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header - Pack G: Enhanced consistency */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Link href="/admin" className="hover:text-amber-700 transition">Dashboard</Link>
            <span>/</span>
            <span className="text-stone-900 font-medium">Debtors</span>
          </div>
          
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">💰 Debtors</h1>
              <p className="mt-1 text-sm text-stone-600">
                Customers with outstanding credit balances and repayment tracking
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Link to Orders */}
              <Link
                href="/admin/orders"
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-amber-700 hover:bg-amber-50"
              >
                <Package className="h-4 w-4" />
                Orders
              </Link>
              
              {/* Summary Card - Pack G: Enhanced styling */}
              <div className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-3 text-white shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-purple-200">Total Outstanding</div>
                    <div className="text-xl font-bold">{peso(totalOwed)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats - Pack G: Enhanced stat cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-stone-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Active Debtors</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-stone-900">{debtors.length}</div>
          </div>
          
          <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-purple-600">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <Wallet className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Average Debt</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-900">
              {peso(debtors.length > 0 ? Math.round(totalOwed / debtors.length) : 0)}
            </div>
          </div>
          
          <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <AlertCircle className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Credit Orders</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-900">
              {debtors.reduce((sum, d) => sum + d.order_count, 0)}
            </div>
          </div>
        </div>

        {/* Debtors List - Pack G: Enhanced cards */}
        {debtors.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-lg font-semibold text-stone-900">No Outstanding Debt</h3>
            <p className="mt-2 text-stone-600 max-w-md mx-auto">
              All credit orders have been settled. New credit orders will appear here automatically.
            </p>
            <Link
              href="/admin/orders"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-amber-800 hover:to-amber-950"
            >
              <Package className="h-4 w-4" />
              View Orders
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {debtors.map((debtor) => (
              <div
                key={debtor.customer_name}
                className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md hover:border-purple-300"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Customer Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200">
                        <span className="text-lg font-bold text-purple-700">
                          {debtor.customer_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{debtor.customer_name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span className="rounded-full bg-stone-100 px-2 py-0.5">{debtor.order_count} order{debtor.order_count !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>Last order: {new Date(debtor.last_order_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className="text-xs text-stone-500 uppercase tracking-wide">Balance Due</div>
                      <div className="text-2xl font-bold text-purple-700">{peso(debtor.total_owed)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Note - Pack G: Enhanced help box */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">How to record a repayment</p>
              <p className="text-sm text-amber-800 mt-1">
                Go to <Link href="/admin/orders" className="font-semibold underline hover:text-amber-950">Orders</Link>, 
                find the customer's order, and click <strong>Record Full Repayment</strong> to clear their balance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
