"use client";

import { createExpense } from '@/app/admin/(protected)/expenses/actions';
import { useRef } from 'react';

export default function AddExpenseForm({ batches }: { batches: any[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form 
      ref={formRef}
      action={async (formData) => {
        await createExpense(formData);
        formRef.current?.reset(); // Clears the form after success
      }} 
      className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8"
    >
      <h3 className="text-lg font-bold mb-4 text-gray-800 text-center md:text-left">New Expense</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input name="description" placeholder="Item/Service" className="p-2 border rounded-md text-sm outline-blue-500" required />
        
        <input name="amount" type="number" step="0.01" placeholder="Amount (₱)" className="p-2 border rounded-md text-sm outline-blue-500" required />
        
        <select name="category" className="p-2 border rounded-md text-sm outline-blue-500 bg-white">
          <option value="Supplies">Supplies</option>
          <option value="Utilities">Utilities</option>
          <option value="Rent">Rent</option>
          <option value="Marketing">Marketing</option>
          <option value="Others">Others</option>
        </select>

        <select name="batch_id" className="p-2 border rounded-md text-sm outline-blue-500 bg-white">
          <option value="">No Batch (General)</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>Batch: {b.id.slice(0,8)}</option>
          ))}
        </select>
      </div>
      
      <button 
        type="submit" 
        className="mt-4 w-full md:w-auto bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 transition active:scale-95"
      >
        Add to Ledger
      </button>
    </form>
  );
}
