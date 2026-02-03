"use client";

import React from 'react';
import { deleteExpense } from '@/app/admin/(protected)/expenses/actions';

export default function ExpenseTable({ expenses }: { expenses: any[] }) {
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteExpense(id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
          <tr>
            <th className="px-6 py-4 text-left">Batch</th>
            <th className="px-6 py-4 text-left">Description</th>
            <th className="px-6 py-4 text-left">Category</th>
            <th className="px-6 py-4 text-left">Amount</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white text-sm">
          {expenses.length === 0 ? (
            <tr><td colSpan={5} className="p-10 text-center text-gray-400">No records.</td></tr>
          ) : (
            expenses.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition group">
                <td className="px-6 py-4 font-mono text-xs text-blue-600">
                  {e.batch_id ? e.batch_id.slice(0, 8) : 'General'}
                </td>
                <td className="px-6 py-4 text-gray-900 font-medium">{e.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold uppercase">{e.category}</span>
                </td>
                <td className="px-6 py-4 font-bold text-gray-900">₱{parseFloat(e.amount).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(e.id)}
                    className="text-red-400 hover:text-red-600 font-medium transition opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
