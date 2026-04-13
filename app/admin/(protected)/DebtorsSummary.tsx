import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import { Wallet, Users, AlertCircle } from "lucide-react";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

export default async function DebtorsSummary() {
  const supabase = await supabaseServer();

  // Fetch all credit payments with balance due
  const { data: creditPayments, error } = await supabase
    .from("payments")
    .select(`
      balance_due_cents,
      orders!inner(customer_name)
    `)
    .eq("method", "credit")
    .gt("balance_due_cents", 0);

  if (error) {
    console.error("Debtors summary error:", error);
    return null;
  }

  // Aggregate by customer
  const debtorMap = new Map<string, number>();
  
  (creditPayments ?? []).forEach((payment: any) => {
    const customerName = payment.orders?.customer_name ?? "Unknown";
    const current = debtorMap.get(customerName) ?? 0;
    debtorMap.set(customerName, current + (payment.balance_due_cents ?? 0));
  });

  const debtorCount = debtorMap.size;
  const totalOwed = Array.from(debtorMap.values()).reduce((sum, amount) => sum + amount, 0);

  if (debtorCount === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-stone-900">Credit / Debtors</div>
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-center">
          <Wallet className="mx-auto h-8 w-8 text-stone-400" />
          <p className="mt-2 text-sm text-stone-600">No outstanding credit balances</p>
          <p className="text-xs text-stone-500">Credit orders will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-purple-900">Credit / Debtors</div>
        <Link 
          href="/admin/debtors" 
          className="text-sm font-medium text-purple-700 transition hover:text-purple-800 hover:underline"
        >
          View All
        </Link>
      </div>
      
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-purple-200 bg-white p-3">
          <div className="flex items-center gap-2 text-purple-600">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Active Debtors</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-purple-900">{debtorCount}</div>
        </div>
        
        <div className="rounded-xl border border-purple-200 bg-white p-3">
          <div className="flex items-center gap-2 text-purple-600">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Total Outstanding</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-purple-900">{peso(totalOwed)}</div>
        </div>
      </div>
      
      <div className="mt-3 rounded-lg bg-purple-100/50 border border-purple-200 p-3">
        <div className="flex items-start gap-2 text-xs text-purple-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Customers with unpaid credit orders. Go to <Link href="/admin/orders" className="font-semibold hover:underline">Orders</Link> to record repayments.
          </p>
        </div>
      </div>
    </div>
  );
}
