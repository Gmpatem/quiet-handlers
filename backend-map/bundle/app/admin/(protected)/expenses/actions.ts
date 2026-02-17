'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createExpense(formData: FormData) {
  const supabase = await createClient();

  const data = {
    description: formData.get('description') as string,
    amount: parseFloat(formData.get('amount') as string),
    category: formData.get('category') as string,
    batch_id: formData.get('batch_id') || null,
  };

  const { error } = await supabase.from('expenses').insert([data]);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/expenses');
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/expenses');
}
