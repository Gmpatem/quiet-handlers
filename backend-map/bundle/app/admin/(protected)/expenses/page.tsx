import ExpenseTable from '@/components/admin/ExpenseTable';
import AddExpenseForm from '@/components/admin/AddExpenseForm';
import { createClient } from '@/lib/supabase/server';

export default async function ExpensesPage() {
  const supabase = await createClient();

  // 1. Efficient Parallel Fetch (One trip to the DB for both tables)
  const [expensesRes, batchesRes] = await Promise.all([
    supabase.from('expenses').select('*').order('created_at', { ascending: false }),
    supabase.from('inventory_batches').select('id').limit(10) // Only need IDs for the dropdown
  ]);

  const expenses = expensesRes.data || [];
  const batches = batchesRes.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Financials</h1>
        <p className="text-gray-500 text-sm">Efficient management for TenPesoRun</p>
      </header>

      {/* The Write Component */}
      <AddExpenseForm batches={batches} />

      {/* The Read Component */}
      <div className="mt-10">
        <h3 className="text-sm uppercase font-bold text-gray-400 mb-4 tracking-widest">Expense History</h3>
        <ExpenseTable expenses={expenses} />
      </div>
    </div>
  );
}
