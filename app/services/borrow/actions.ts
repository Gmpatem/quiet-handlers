"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export type BorrowFormData = {
  borrowerName: string;
  itemId: string;
  quantity: number;
};

export type ActionResult = {
  success: boolean;
  error?: string;
  requestId?: string;
};

export async function submitBorrowRequest(data: BorrowFormData): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    if (!data.borrowerName || data.borrowerName.trim().length < 2) {
      return { success: false, error: "Please enter your name / room" };
    }
    if (!data.itemId) {
      return { success: false, error: "Please select an item" };
    }
    if (!Number.isFinite(data.quantity) || data.quantity < 1 || data.quantity > 99) {
      return { success: false, error: "Invalid quantity" };
    }

    // Fetch product to verify availability in single stock system
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, stock_qty, is_active, price_cents")
      .eq("id", data.itemId)
      .single();

    if (productError || !product) {
      return { success: false, error: "Selected item not found" };
    }
    if (!product.is_active) {
      return { success: false, error: "Selected item is currently inactive" };
    }
    if (product.stock_qty < data.quantity) {
      return {
        success: false,
        error: `Only ${product.stock_qty} available in stock`,
      };
    }

    const orderId = crypto.randomUUID();
    const orderCode = `BRW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Atomically consume inventory and create credit order in existing Tenpesorun commerce workflow
    const { error: rpcError } = await supabase.rpc("place_order_atomic", {
      p_order_id: orderId,
      p_order_code: orderCode,
      p_customer_name: data.borrowerName.trim(),
      p_contact: data.borrowerName.trim(),
      p_notes: `[BORROW] Borrower: ${data.borrowerName.trim()}`,
      p_fulfillment: "pickup",
      p_pickup_location: "boys_411",
      p_delivery_fee_cents: 0,
      p_delivery_location: "",
      p_payment_method: "credit",
      p_payment_status: "pending",
      p_payment_ref: "QR-BORROW",
      p_items: [{ product_id: data.itemId, qty: data.quantity }],
      p_suggestion: null,
    });

    if (rpcError) {
      console.error("place_order_atomic error:", rpcError);
      return {
        success: false,
        error: rpcError.message?.includes("insufficient")
          ? "Item is currently out of stock"
          : "We couldn't submit your borrowing request. Please try again or visit Room 411.",
      };
    }

    // Optional audit entry in borrowings table
    try {
      await supabase.from("borrowings").insert({
        id: orderId,
        borrower_name: data.borrowerName.trim(),
        item_id: data.itemId,
        item_name_snapshot: product.name,
        quantity: data.quantity,
        status: "borrowed",
      });
    } catch (auditErr) {
      console.warn("Audit record notice:", auditErr);
    }

    revalidatePath("/admin/credit-orders");
    revalidatePath("/admin/debtors");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory-management");
    revalidatePath("/services/borrow");

    return { success: true, requestId: orderCode };
  } catch (error: any) {
    console.error("Submit borrow request error:", error);
    return {
      success: false,
      error: "We couldn't submit your borrowing request. Please try again or visit Room 411.",
    };
  }
}

export async function markBorrowingReturned(
  borrowingId: string
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Mark corresponding payment as paid in payments table
    await supabase
      .from("payments")
      .update({
        status: "paid",
        balance_due_cents: 0,
        paid_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq("order_id", borrowingId);

    // Update order status
    await supabase
      .from("orders")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", borrowingId);

    // Update borrowings row if present
    await supabase
      .from("borrowings")
      .update({
        status: "returned",
        returned_at: new Date().toISOString(),
        returned_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", borrowingId);

    revalidatePath("/admin/credit-orders");
    revalidatePath("/admin/debtors");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory-management");

    return { success: true };
  } catch (error: any) {
    console.error("Mark returned error:", error);
    return { success: false, error: error?.message || "Failed to mark returned" };
  }
}
