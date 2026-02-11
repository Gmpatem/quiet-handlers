'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export type PrintingFormData = {
  studentName: string;
  serviceType: 'print' | 'photocopy' | 'scan';
  colorType?: 'bw' | 'color';
  paperSize?: 'a4' | 'letter' | 'legal';
  pages: number;
  copies: number;
  sided?: 'single' | 'double';
  binding: boolean;
  specialInstructions?: string;
  paymentMethod: 'gcash' | 'cash';
  totalAmount: number;
};

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Upload PDF file to Supabase Storage
 */
export async function uploadPDF(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return { success: false, error: 'Only PDF files are allowed' };
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 100MB' };
    }

    // Generate unique filename
    const fileExt = 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `pdfs/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('printing-pdfs')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      return { success: false, error: 'Failed to upload PDF' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('printing-pdfs')
      .getPublicUrl(filePath);

    return { 
      success: true, 
      data: { url: urlData.publicUrl, path: filePath }
    };
  } catch (error) {
    console.error('Upload PDF error:', error);
    return { success: false, error: 'Failed to upload PDF' };
  }
}

/**
 * Upload payment proof image to Supabase Storage
 */
export async function uploadPaymentProof(formData: FormData): Promise<ActionResult> {
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

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Image size must be less than 10MB' };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `proofs/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('printing-proofs')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Payment proof upload error:', uploadError);
      return { success: false, error: 'Failed to upload payment proof' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('printing-proofs')
      .getPublicUrl(filePath);

    return { 
      success: true, 
      data: { url: urlData.publicUrl, path: filePath }
    };
  } catch (error) {
    console.error('Upload payment proof error:', error);
    return { success: false, error: 'Failed to upload payment proof' };
  }
}

/**
 * Submit printing request
 */
export async function submitPrintingRequest(
  data: PrintingFormData,
  pdfUrl?: string,
  paymentProofUrl?: string
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    // Validate required fields
    if (!data.studentName.trim()) {
      return { success: false, error: 'Student name is required' };
    }

    if (data.serviceType === 'print' && !pdfUrl) {
      return { success: false, error: 'PDF file is required for printing' };
    }

    if (data.paymentMethod === 'gcash' && !paymentProofUrl) {
      return { success: false, error: 'Payment proof is required for GCash payment' };
    }

    // Prepare insert data
    const insertData = {
      student_name: data.studentName.trim(),
      service_type: data.serviceType,
      pdf_url: pdfUrl || null,
      color_type: data.colorType || null,
      paper_size: data.paperSize || null,
      pages: data.pages,
      copies: data.copies,
      sided: data.sided || null,
      binding: data.binding,
      special_instructions: data.specialInstructions?.trim() || null,
      payment_method: data.paymentMethod,
      payment_proof_url: paymentProofUrl || null,
      total_amount: data.totalAmount,
      payment_status: data.paymentMethod === 'gcash' ? 'paid' : 'unpaid',
      status: 'pending'
    };

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from('printing_requests')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return { success: false, error: 'Failed to submit request' };
    }

    // Revalidate admin pages
    revalidatePath('/admin/printing');

    return { 
      success: true, 
      data: { id: insertedData.id }
    };
  } catch (error) {
    console.error('Submit request error:', error);
    return { success: false, error: 'Failed to submit request' };
  }
}

/**
 * Complete workflow: Upload files and submit request
 */
export async function submitCompletePrintingRequest(formData: FormData): Promise<ActionResult> {
  try {
    // Parse form data
    const studentName = formData.get('studentName') as string;
    const serviceType = formData.get('serviceType') as 'print' | 'photocopy' | 'scan';
    const colorType = formData.get('colorType') as 'bw' | 'color' | null;
    const paperSize = formData.get('paperSize') as 'a4' | 'letter' | 'legal' | null;
    const pages = parseInt(formData.get('pages') as string);
    const copies = parseInt(formData.get('copies') as string);
    const sided = formData.get('sided') as 'single' | 'double' | null;
    const binding = formData.get('binding') === 'true';
    const specialInstructions = formData.get('specialInstructions') as string | null;
    const paymentMethod = formData.get('paymentMethod') as 'gcash' | 'cash';
    const totalAmount = parseFloat(formData.get('totalAmount') as string);
    const pdfFile = formData.get('pdfFile') as File | null;
    const paymentProofFile = formData.get('paymentProof') as File | null;

    let pdfUrl: string | undefined;
    let paymentProofUrl: string | undefined;

    // Upload PDF if provided
    if (pdfFile && pdfFile.size > 0) {
      const pdfFormData = new FormData();
      pdfFormData.append('pdf', pdfFile);
      const pdfResult = await uploadPDF(pdfFormData);
      
      if (!pdfResult.success) {
        return pdfResult;
      }
      
      pdfUrl = pdfResult.data?.url;
    }

    // Upload payment proof if provided
    if (paymentProofFile && paymentProofFile.size > 0) {
      const proofFormData = new FormData();
      proofFormData.append('paymentProof', paymentProofFile);
      const proofResult = await uploadPaymentProof(proofFormData);
      
      if (!proofResult.success) {
        return proofResult;
      }
      
      paymentProofUrl = proofResult.data?.url;
    }

    // Submit request
    const requestData: PrintingFormData = {
      studentName,
      serviceType,
      colorType: colorType || undefined,
      paperSize: paperSize || undefined,
      pages,
      copies,
      sided: sided || undefined,
      binding,
      specialInstructions: specialInstructions || undefined,
      paymentMethod,
      totalAmount
    };

    return await submitPrintingRequest(requestData, pdfUrl, paymentProofUrl);
  } catch (error) {
    console.error('Complete submission error:', error);
    return { success: false, error: 'Failed to submit request' };
  }
}
