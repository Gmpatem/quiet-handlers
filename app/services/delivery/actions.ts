'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { validateDeliveryData, type ActionResult } from '@/lib/validation';

export type DeliveryFormData = {
  studentName: string;
  studentContact: string;
  itemDescription: string;
  storeLocation?: string;
  paymentMethod: 'prepaid' | 'cod';
  deliveryFee: number;
};

/**
 * Upload payment proof image to Supabase Storage
 */
export async function uploadDeliveryPaymentProof(formData: FormData): Promise<ActionResult> {
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

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image size must be less than 5MB' };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `delivery-proofs/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('delivery-proofs')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Delivery proof upload error:', uploadError);
      return { success: false, error: 'Failed to upload payment proof' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('delivery-proofs')
      .getPublicUrl(filePath);

    return { 
      success: true, 
      data: { url: urlData.publicUrl, path: filePath }
    };
  } catch (error) {
    console.error('Upload delivery proof error:', error);
    return { success: false, error: 'Failed to upload payment proof' };
  }
}

/**
 * Submit delivery request
 */
export async function submitDeliveryRequest(
  data: DeliveryFormData,
  paymentProofUrl?: string
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    // Validate required fields using shared validation
    const validation = validateDeliveryData(
      data.studentName,
      data.studentContact,
      data.itemDescription,
      data.deliveryFee
    );

    if (!validation.success) {
      return validation;
    }

    if (data.paymentMethod === 'prepaid' && !paymentProofUrl) {
      return { success: false, error: 'Payment proof is required for prepaid orders' };
    }

    // Prepare insert data
    const insertData = {
      student_name: data.studentName.trim(),
      student_contact: data.studentContact.trim(),
      item_description: data.itemDescription.trim(),
      store_location: data.storeLocation?.trim() || null,
      payment_method: data.paymentMethod,
      delivery_fee: data.deliveryFee,
      payment_proof_url: paymentProofUrl || null,
      payment_status: data.paymentMethod === 'prepaid' ? 'paid' : 'unpaid',
      status: 'pending'
    };

    // Insert into database
    const { error: insertError } = await supabase
      .from('delivery_requests')
      .insert(insertData);

    if (insertError) {
      console.error('Database insert error:', insertError);
      return { success: false, error: insertError.message || 'Failed to submit request' };
    }

    // Revalidate admin pages
    revalidatePath('/admin/deliveries');

    return { success: true };
  } catch (error: any) {
    console.error('Submit delivery request error:', error);
    return { success: false, error: error?.message || 'Failed to submit request' };
  }
}

/**
 * Complete workflow: Upload payment proof (if needed) and submit request
 */
export async function submitCompleteDeliveryRequest(formData: FormData): Promise<ActionResult> {
  try {
    // Parse form data
    const studentName = formData.get('studentName') as string;
    const studentContact = formData.get('studentContact') as string;
    const itemDescription = formData.get('itemDescription') as string;
    const storeLocation = formData.get('storeLocation') as string | null;
    const paymentMethod = formData.get('paymentMethod') as 'prepaid' | 'cod';
    const deliveryFee = parseFloat(formData.get('deliveryFee') as string);
    const paymentProofFile = formData.get('paymentProof') as File | null;

    let paymentProofUrl: string | undefined;

    // Upload payment proof if prepaid and file provided
    if (paymentMethod === 'prepaid' && paymentProofFile && paymentProofFile.size > 0) {
      const proofFormData = new FormData();
      proofFormData.append('paymentProof', paymentProofFile);
      const proofResult = await uploadDeliveryPaymentProof(proofFormData);
      
      if (!proofResult.success) {
        return proofResult;
      }
      
      paymentProofUrl = proofResult.data?.url;
    }

    // Submit request
    const requestData: DeliveryFormData = {
      studentName,
      studentContact,
      itemDescription,
      storeLocation: storeLocation || undefined,
      paymentMethod,
      deliveryFee
    };

    return await submitDeliveryRequest(requestData, paymentProofUrl);
  } catch (error) {
    console.error('Complete delivery submission error:', error);
    return { success: false, error: 'Failed to submit request' };
  }
}

/**
 * Update delivery status (admin use)
 */
export async function updateDeliveryStatus(
  requestId: string,
  newStatus: 'pending' | 'processing' | 'out_for_delivery' | 'completed' | 'cancelled',
  riderName?: string,
  adminNotes?: string
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    // Verify user is authenticated and admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' };
    }

    // Prepare update data
    const updateData: any = {
      status: newStatus,
    };

    // riderName is kept in the function signature for backward-compatibility
    // with existing callers, but delivery_requests has no rider_name column.
    void riderName;

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes.trim() || null;
    }

    // Update status
    const { error: updateError } = await supabase
      .from('delivery_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('Update status error:', updateError);
      return { success: false, error: 'Failed to update status' };
    }

    // Revalidate admin pages
    revalidatePath('/admin/deliveries');

    return { success: true };
  } catch (error) {
    console.error('Update delivery status error:', error);
    return { success: false, error: 'Failed to update status' };
  }
}
