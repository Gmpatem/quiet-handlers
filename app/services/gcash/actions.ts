'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { 
  validateGCashData, 
  calculateGCashFee,
  type ActionResult,
  type GCashTransactionType 
} from '@/lib/validation';

export type GCashFormData = {
  studentName: string;
  studentContact: string;
  transactionType: GCashTransactionType;
  amount: number;
  serviceFee: number;
  totalAmount: number;
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
 * Submit GCash request
 */
export async function submitGCashRequest(
  data: GCashFormData,
  paymentProofUrl?: string
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    // Validate calculation data
    const validation = validateGCashData(
      data.transactionType,
      data.amount,
      data.serviceFee,
      data.totalAmount
    );

    if (!validation.success) {
      return validation;
    }

    // Note: cash_in doesn't require payment proof (user brings cash to Room 411)
    // cash_out requires proof that user sent money via GCash
    if (data.transactionType === 'cash_out' && !paymentProofUrl) {
      return { success: false, error: 'Payment proof is required for cash-out' };
    }

    // Prepare insert data
    const insertData = {
      student_name: data.studentName.trim(),
      student_contact: data.studentContact.trim(),
      transaction_type: data.transactionType,
      amount: data.amount,
      service_fee: data.serviceFee,
      total_amount: data.totalAmount,
      payment_proof_url: paymentProofUrl || null,
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
    const paymentProofFile = formData.get('paymentProof') as File | null;

    let paymentProofUrl: string | undefined;

    // Upload payment proof for cash_out transactions
    if (transactionType === 'cash_out' && paymentProofFile && paymentProofFile.size > 0) {
      const proofFormData = new FormData();
      proofFormData.append('paymentProof', paymentProofFile);
      const proofResult = await uploadGCashPaymentProof(proofFormData);
      
      if (!proofResult.success) {
        return proofResult;
      }
      
      paymentProofUrl = proofResult.data?.url;
    }

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
