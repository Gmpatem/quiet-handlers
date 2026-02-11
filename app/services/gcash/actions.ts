'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export type GCashTransactionType = 'cash_in' | 'send_money' | 'bills_payment' | 'buy_load';

export type GCashFormData = {
  studentName: string;
  studentContact: string;
  transactionType: GCashTransactionType;
  amount: number;
  serviceFee: number;
  totalAmount: number;
};

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Upload payment proof image to Supabase Storage
 */
export async function uploadGCashPaymentProof(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    const file = formData.get('paymentProof') as File;
    
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Only image files are allowed' };
    }

    // Validate file size (5MB for GCash proofs)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image size must be less than 5MB' };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `gcash-proofs/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('gcash-proofs')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('GCash proof upload error:', uploadError);
      return { success: false, error: 'Failed to upload payment proof' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('gcash-proofs')
      .getPublicUrl(filePath);

    return { 
      success: true, 
      data: { url: urlData.publicUrl, path: filePath }
    };
  } catch (error) {
    console.error('Upload GCash proof error:', error);
    return { success: false, error: 'Failed to upload payment proof' };
  }
}

/**
 * Calculate GCash service fee based on transaction type and amount
 */
export function calculateGCashFee(transactionType: GCashTransactionType, amount: number): number {
  // Fee structure based on your GCASH_CONFIG
  const feeRates: Record<GCashTransactionType, number> = {
    cash_in: 0.02,        // 2% fee
    send_money: 0.015,    // 1.5% fee
    bills_payment: 0.01,  // 1% fee
    buy_load: 0.01        // 1% fee
  };

  const rate = feeRates[transactionType] || 0.02;
  return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Submit GCash request
 */
export async function submitGCashRequest(
  data: GCashFormData,
  paymentProofUrl: string
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    // Validate required fields
    if (!data.studentName.trim()) {
      return { success: false, error: 'Student name is required' };
    }

    if (!data.studentContact.trim()) {
      return { success: false, error: 'Contact number is required' };
    }

    if (data.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    if (!paymentProofUrl) {
      return { success: false, error: 'Payment proof is required' };
    }

    // Prepare insert data
    const insertData = {
      student_name: data.studentName.trim(),
      student_contact: data.studentContact.trim(),
      transaction_type: data.transactionType,
      amount: data.amount,
      service_fee: data.serviceFee,
      total_amount: data.totalAmount,
      payment_proof_url: paymentProofUrl,
      status: 'pending'
    };

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from('gcash_requests')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return { success: false, error: 'Failed to submit request' };
    }

    // Revalidate admin pages
    revalidatePath('/admin/gcash');

    return { 
      success: true, 
      data: { id: insertedData.id }
    };
  } catch (error) {
    console.error('Submit GCash request error:', error);
    return { success: false, error: 'Failed to submit request' };
  }
}

/**
 * Complete workflow: Upload payment proof and submit request
 */
export async function submitCompleteGCashRequest(formData: FormData): Promise<ActionResult> {
  try {
    // Parse form data
    const studentName = formData.get('studentName') as string;
    const studentContact = formData.get('studentContact') as string;
    const transactionType = formData.get('transactionType') as GCashTransactionType;
    const amount = parseFloat(formData.get('amount') as string);
    const serviceFee = parseFloat(formData.get('serviceFee') as string);
    const totalAmount = parseFloat(formData.get('totalAmount') as string);
    const paymentProofFile = formData.get('paymentProof') as File;

    // Validate payment proof file
    if (!paymentProofFile || paymentProofFile.size === 0) {
      return { success: false, error: 'Payment proof is required' };
    }

    // Upload payment proof
    const proofFormData = new FormData();
    proofFormData.append('paymentProof', paymentProofFile);
    const proofResult = await uploadGCashPaymentProof(proofFormData);
    
    if (!proofResult.success) {
      return proofResult;
    }
    
    const paymentProofUrl = proofResult.data?.url;

    // Submit request
    const requestData: GCashFormData = {
      studentName,
      studentContact,
      transactionType,
      amount,
      serviceFee,
      totalAmount
    };

    return await submitGCashRequest(requestData, paymentProofUrl);
  } catch (error) {
    console.error('Complete GCash submission error:', error);
    return { success: false, error: 'Failed to submit request' };
  }
}

/**
 * Validate GCash transaction data
 */
export function validateGCashData(
  transactionType: GCashTransactionType,
  amount: number,
  serviceFee: number,
  totalAmount: number
): ActionResult {
  // Validate amount
  if (amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  // Validate minimum/maximum amounts based on transaction type
  const limits: Record<GCashTransactionType, { min: number; max: number }> = {
    cash_in: { min: 100, max: 50000 },
    send_money: { min: 1, max: 50000 },
    bills_payment: { min: 1, max: 100000 },
    buy_load: { min: 10, max: 1000 }
  };

  const limit = limits[transactionType];
  if (amount < limit.min) {
    return { 
      success: false, 
      error: `Minimum amount for ${transactionType.replace('_', ' ')} is ₱${limit.min}` 
    };
  }

  if (amount > limit.max) {
    return { 
      success: false, 
      error: `Maximum amount for ${transactionType.replace('_', ' ')} is ₱${limit.max}` 
    };
  }

  // Validate service fee calculation
  const expectedFee = calculateGCashFee(transactionType, amount);
  if (Math.abs(serviceFee - expectedFee) > 0.01) {
    return { 
      success: false, 
      error: 'Invalid service fee calculation' 
    };
  }

  // Validate total amount
  const expectedTotal = amount + serviceFee;
  if (Math.abs(totalAmount - expectedTotal) > 0.01) {
    return { 
      success: false, 
      error: 'Invalid total amount calculation' 
    };
  }

  return { success: true };
}
