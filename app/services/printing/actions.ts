"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import {
  calculatePrintPrice,
  validatePrintSubmission,
  type ColorType,
  type PaperSize,
  type SidedType,
} from "@/lib/printing/pricing";
import { getPrintPricingSettings } from "@/lib/printing/pricing-server";

export type PrintingFormData = {
  studentName: string;
  serviceType: "print" | "photocopy" | "scan";
  colorType?: ColorType;
  paperSize?: PaperSize;
  pages: number;
  copies: number;
  sided?: SidedType;
  binding: boolean;
  specialInstructions?: string;
  paymentMethod: "gcash" | "cash";
  totalAmount: number;
};

export type ActionResult = {
  success: boolean;
  error?: string;
  requestId?: string;
  data?: any;
};

export async function uploadPDF(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    const file = formData.get("pdf") as File;

    if (!file) return { success: false, error: "No file provided" };
    if (file.type !== "application/pdf") return { success: false, error: "Only PDF files are allowed" };
    if (file.size > 100 * 1024 * 1024) return { success: false, error: "File size must be less than 100MB" };

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
    const filePath = `pdfs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("printing-pdfs")
      .upload(filePath, file, { contentType: "application/pdf", upsert: false });

    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      return { success: false, error: "Failed to upload PDF" };
    }

    const { data: urlData } = supabase.storage.from("printing-pdfs").getPublicUrl(filePath);
    return { success: true, data: { url: urlData.publicUrl, path: filePath } };
  } catch (error) {
    console.error("Upload PDF error:", error);
    return { success: false, error: "Failed to upload PDF" };
  }
}

export async function uploadPaymentProof(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    const file = formData.get("paymentProof") as File;

    if (!file) return { success: false, error: "No file provided" };
    if (!file.type.startsWith("image/")) return { success: false, error: "Only image files are allowed" };
    if (file.size > 10 * 1024 * 1024) return { success: false, error: "Image size must be less than 10MB" };

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("printing-proofs")
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Payment proof upload error:", uploadError);
      return { success: false, error: "Failed to upload payment proof" };
    }

    const { data: urlData } = supabase.storage.from("printing-proofs").getPublicUrl(filePath);
    return { success: true, data: { url: urlData.publicUrl, path: filePath } };
  } catch (error) {
    console.error("Upload payment proof error:", error);
    return { success: false, error: "Failed to upload payment proof" };
  }
}

export async function submitPrintingRequest(
  data: PrintingFormData,
  pdfUrl?: string,
  paymentProofUrl?: string
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    if (!data.studentName.trim()) {
      return { success: false, error: "Student name is required" };
    }

    if (data.serviceType === "print" && !pdfUrl) {
      return { success: false, error: "PDF file is required for printing" };
    }

    if (data.paymentMethod === "gcash" && !paymentProofUrl) {
      return { success: false, error: "Payment proof is required for GCash payment" };
    }

    const settings = await getPrintPricingSettings();
    const expected = calculatePrintPrice(
      settings,
      data.colorType || "bw",
      data.paperSize || "a4",
      data.copies,
      data.sided || "single"
    );

    const validation = validatePrintSubmission(
      data.studentName,
      data.colorType || "bw",
      data.paperSize || "a4",
      data.copies,
      data.sided || "single",
      data.totalAmount,
      expected.total
    );

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Duplicate guard: same name + same total within last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("printing_requests")
      .select("id")
      .eq("student_name", data.studentName.trim())
      .eq("total_amount", expected.total)
      .gte("created_at", thirtySecondsAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return { success: false, error: "Duplicate request detected. Please wait a moment." };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("printing_requests")
      .insert({
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
        total_amount: expected.total,
        payment_status: data.paymentMethod === "gcash" ? "paid" : "unpaid",
        status: "pending",
        pricing_snapshot: expected.snapshot,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return { success: false, error: insertError.message || "Failed to submit request" };
    }

    revalidatePath("/admin/printing");
    revalidatePath("/admin/qr-services");
    return { success: true, requestId: inserted?.id };
  } catch (error: any) {
    console.error("Submit request error:", error);
    return { success: false, error: error?.message || "Failed to submit request" };
  }
}

export async function submitCompletePrintingRequest(formData: FormData): Promise<ActionResult> {
  try {
    const studentName = formData.get("studentName") as string;
    const serviceType = (formData.get("serviceType") as "print" | "photocopy" | "scan") || "print";
    const colorType = (formData.get("colorType") as ColorType | null) || "bw";
    const paperSize = (formData.get("paperSize") as PaperSize | null) || "a4";
    const pages = parseInt(formData.get("pages") as string) || 1;
    const copies = parseInt(formData.get("copies") as string) || 1;
    const sided = (formData.get("sided") as SidedType | null) || "single";
    const binding = formData.get("binding") === "true";
    const specialInstructions = (formData.get("specialInstructions") as string | null) || "";
    const paymentMethod = (formData.get("paymentMethod") as "gcash" | "cash") || "cash";
    const totalAmount = parseFloat(formData.get("totalAmount") as string) || 0;
    const pdfFile = formData.get("pdfFile") as File | null;
    const paymentProofFile = formData.get("paymentProof") as File | null;

    let pdfUrl: string | undefined;
    let paymentProofUrl: string | undefined;

    if (pdfFile && pdfFile.size > 0) {
      const pdfFormData = new FormData();
      pdfFormData.append("pdf", pdfFile);
      const pdfResult = await uploadPDF(pdfFormData);
      if (!pdfResult.success) return pdfResult;
      pdfUrl = pdfResult.data?.url;
    }

    if (paymentProofFile && paymentProofFile.size > 0) {
      const proofFormData = new FormData();
      proofFormData.append("paymentProof", paymentProofFile);
      const proofResult = await uploadPaymentProof(proofFormData);
      if (!proofResult.success) return proofResult;
      paymentProofUrl = proofResult.data?.url;
    }

    const requestData: PrintingFormData = {
      studentName,
      serviceType,
      colorType,
      paperSize,
      pages,
      copies,
      sided,
      binding,
      specialInstructions: specialInstructions || undefined,
      paymentMethod,
      totalAmount,
    };

    return await submitPrintingRequest(requestData, pdfUrl, paymentProofUrl);
  } catch (error) {
    console.error("Complete submission error:", error);
    return { success: false, error: "Failed to submit request" };
  }
}

export async function updatePrintingRequest(
  requestId: string,
  updates: {
    status?: "pending" | "processing" | "ready" | "completed" | "cancelled";
    admin_notes?: string;
  }
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updateData: any = { updated_at: new Date().toISOString() };
    if (updates.status) updateData.status = updates.status;
    if (updates.admin_notes !== undefined) updateData.admin_notes = updates.admin_notes.trim() || null;

    const { error: updateError } = await supabase
      .from("printing_requests")
      .update(updateData)
      .eq("id", requestId);

    if (updateError) {
      console.error("Update request error:", updateError);
      return { success: false, error: "Failed to update request" };
    }

    revalidatePath("/admin/printing");
    revalidatePath("/admin/qr-services");
    return { success: true };
  } catch (error) {
    console.error("Update printing request error:", error);
    return { success: false, error: "Failed to update request" };
  }
}
