"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import {
  calculateGCashFee,
  validateGCashSubmission,
  type GCashTransactionType,
} from "@/lib/gcash/fees";
import { getGCashSettings } from "@/lib/gcash/fees-server";

export type GCashFormData = {
  studentName: string;
  studentContact: string;
  transactionType: GCashTransactionType;
  amount: number;
  serviceFee: number;
  totalAmount: number;
  referenceNotes?: string;
};

export type ActionResult = {
  success: boolean;
  error?: string;
  requestId?: string;
  data?: any;
};

export async function uploadGCashPaymentProof(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    const file = formData.get("paymentProof") as File;

    if (!file) return { success: false, error: "No file provided" };
    if (!file.type.startsWith("image/")) return { success: false, error: "Only image files are allowed" };
    if (file.size > 5 * 1024 * 1024) return { success: false, error: "Image size must be less than 5MB" };

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `gcash-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("gcash-proofs")
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("GCash proof upload error:", uploadError);
      return { success: false, error: "Failed to upload payment proof" };
    }

    const { data: urlData } = supabase.storage.from("gcash-proofs").getPublicUrl(filePath);
    return { success: true, data: { url: urlData.publicUrl, path: filePath } };
  } catch (error) {
    console.error("Upload GCash proof error:", error);
    return { success: false, error: "Failed to upload payment proof" };
  }
}

async function getDbClient() {
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import("@/lib/supabase/admin");
      return supabaseAdmin();
    }
  } catch (err) {
    console.warn("Could not load supabaseAdmin, falling back to supabaseServer", err);
  }
  return await supabaseServer();
}

export async function submitGCashRequest(
  data: GCashFormData,
  paymentProofUrl?: string
): Promise<ActionResult> {
  try {
    const supabase = await getDbClient();
    const settings = await getGCashSettings();

    // Authoritative backend fee calculation (never trust client calculation)
    const calc = calculateGCashFee(settings.gcash_fee_rules, data.amount);
    const serviceFee = calc.serviceFee;
    const totalAmount = calc.finalAmount;

    if (!data.studentName || data.studentName.trim().length < 2) {
      return { success: false, error: "Please enter your name" };
    }

    if (!data.studentContact || data.studentContact.trim().length < 4) {
      return { success: false, error: "Please provide valid contact / GCash information" };
    }

    if (data.transactionType === "cash_out" && !data.referenceNotes?.trim() && !paymentProofUrl) {
      return { success: false, error: "GCash reference number or proof is required for cash out" };
    }

    // Duplicate guard: same contact + same amount within last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    try {
      const { data: recent } = await supabase
        .from("gcash_requests")
        .select("id")
        .eq("student_contact", data.studentContact.trim())
        .eq("amount", data.amount)
        .eq("transaction_type", data.transactionType)
        .gte("created_at", thirtySecondsAgo)
        .limit(1);

      if (recent && recent.length > 0) {
        return { success: false, error: "Duplicate request detected. Please wait a moment." };
      }
    } catch {
      // Non-blocking duplicate check
    }

    const requestId = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from("gcash_requests")
      .insert({
        id: requestId,
        student_name: data.studentName.trim(),
        student_contact: data.studentContact.trim(),
        transaction_type: data.transactionType,
        amount: data.amount,
        service_fee: serviceFee,
        total_amount: totalAmount,
        payment_proof_url: paymentProofUrl || null,
        reference_notes: data.referenceNotes?.trim() || null,
        status: "pending",
      });

    if (insertError) {
      console.error("Database insert error:", insertError);
      return {
        success: false,
        error: "We couldn't submit your GCash request. Please try again or visit Room 411.",
      };
    }

    revalidatePath("/admin/gcash");
    revalidatePath("/admin/qr-services");
    return { success: true, requestId };
  } catch (error: any) {
    console.error("Submit GCash request error:", error);
    return {
      success: false,
      error: "We couldn't submit your GCash request. Please try again.",
    };
  }
}

export async function submitCompleteGCashRequest(formData: FormData): Promise<ActionResult> {
  try {
    const studentName = formData.get("studentName") as string;
    const studentContact = formData.get("studentContact") as string;
    const transactionType = formData.get("transactionType") as GCashTransactionType;
    const amount = parseFloat(formData.get("amount") as string);
    const referenceNotes = (formData.get("referenceNotes") as string | null) || "";
    const paymentProofFile = formData.get("paymentProof") as File | null;
    let paymentProofUrl = (formData.get("paymentProofUrl") as string | null) || undefined;

    if (paymentProofFile && paymentProofFile.size > 0) {
      const proofFormData = new FormData();
      proofFormData.append("paymentProof", paymentProofFile);
      const proofResult = await uploadGCashPaymentProof(proofFormData);
      if (!proofResult.success) return proofResult;
      paymentProofUrl = proofResult.data?.url;
    }

    const requestData: GCashFormData = {
      studentName,
      studentContact,
      transactionType,
      amount,
      serviceFee: 0,
      totalAmount: 0,
      referenceNotes: referenceNotes || undefined,
    };

    return await submitGCashRequest(requestData, paymentProofUrl);
  } catch (error) {
    console.error("Complete GCash submission error:", error);
    return { success: false, error: "Failed to submit request" };
  }
}

export async function uploadOwnerGCashQR(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("qrFile") as File;
    if (!file) return { success: false, error: "No file provided" };
    if (!file.type.startsWith("image/")) return { success: false, error: "Only image files are allowed" };
    if (file.size > 5 * 1024 * 1024) return { success: false, error: "Image size must be less than 5MB" };

    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `owner-gcash-qr-${Date.now()}.${fileExt}`;
    const filePath = `gcash-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("gcash-proofs")
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("Owner GCash QR upload error:", uploadError);
      return { success: false, error: "Failed to upload owner QR" };
    }

    const { data: urlData } = supabase.storage.from("gcash-proofs").getPublicUrl(filePath);
    return { success: true, data: { url: urlData.publicUrl, path: filePath } };
  } catch (error: any) {
    console.error("Upload owner GCash QR error:", error);
    return { success: false, error: error?.message || "Failed to upload owner QR" };
  }
}

export async function saveOwnerGCashSettings(
  accountName: string,
  accountNumber: string,
  qrUrl: string,
  feeRules?: any[]
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const updates = [
      { key: "gcash_account_name", value: accountName.trim(), updated_at: new Date().toISOString() },
      { key: "gcash_account_number", value: accountNumber.trim(), updated_at: new Date().toISOString() },
      { key: "gcash_qr_url", value: qrUrl.trim(), updated_at: new Date().toISOString() },
    ];

    if (feeRules && feeRules.length > 0) {
      updates.push({
        key: "gcash_fee_rules",
        value: feeRules as any,
        updated_at: new Date().toISOString(),
      });
    }

    for (const item of updates) {
      const { error } = await supabase
        .from("app_settings")
        .upsert(item, { onConflict: "key" });
      if (error) throw error;
    }

    revalidatePath("/admin/gcash");
    revalidatePath("/services/gcash");
    return { success: true };
  } catch (err: any) {
    console.error("Save GCash settings error:", err);
    return { success: false, error: err?.message || "Failed to save settings" };
  }
}
