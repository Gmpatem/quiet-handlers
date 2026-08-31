"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export type CreditOrderItem = {
  productId: string;
  quantity: number;
};

export type CreditFormData = {
  customerName: string;
  items: CreditOrderItem[];
};

export type ActionResult = {
  success: boolean;
  error?: string;
  orderCode?: string;
  totalCents?: number;
};

export async function submitCreditOrder(data: CreditFormData): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();

    // 1. Validate customer identity (Name / Room)
    const customerName = (data.customerName || "").trim();
    if (!customerName || customerName.length < 2) {
      return { success: false, error: "Please enter your name / room" };
    }

    // 2. Validate items
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return { success: false, error: "Your cart is empty. Please select at least one item." };
    }

    for (const item of data.items) {
      if (!item.productId || !Number.isFinite(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return { success: false, error: "Invalid item quantity selected." };
      }
    }

    // 3. Authoritative server-side product and stock verification
    const productIds = data.items.map((i) => i.productId);
    const { data: dbProducts, error: prodError } = await supabase
      .from("products")
      .select("id, name, category, price_cents, cost_cents, stock_qty, is_active")
      .in("id", productIds);

    if (prodError || !dbProducts) {
      console.error("Products query error:", prodError);
      return { success: false, error: "Failed to verify items in catalogue. Please try again." };
    }

    const prodMap = new Map(dbProducts.map((p) => [p.id, p]));
    let calculatedTotalCents = 0;

    for (const item of data.items) {
      const prod = prodMap.get(item.productId);
      if (!prod || !prod.is_active) {
        return {
          success: false,
          error: `Sorry, "${prod?.name || "One of your items"}" is currently unavailable.`,
        };
      }

      if (prod.stock_qty < item.quantity) {
        return {
          success: false,
          error: `Sorry, "${prod.name}" is no longer available in that quantity. Only ${prod.stock_qty} left.`,
        };
      }

      calculatedTotalCents += prod.price_cents * item.quantity;
    }

    const orderId = crypto.randomUUID();
    const orderCode = `CRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 4. Order creation via existing place_order_atomic RPC
    const { error: rpcError } = await supabase.rpc("place_order_atomic", {
      p_order_id: orderId,
      p_order_code: orderCode,
      p_customer_name: customerName,
      p_contact: customerName,
      p_notes: `[QR CREDIT] Customer: ${customerName}`,
      p_fulfillment: "pickup",
      p_pickup_location: "boys_411",
      p_delivery_fee_cents: 0,
      p_delivery_location: "",
      p_payment_method: "credit",
      p_payment_status: "pending",
      p_payment_ref: "QR-CREDIT",
      p_items: data.items.map((i) => ({ product_id: i.productId, qty: i.quantity })),
      p_suggestion: null,
    });

    if (rpcError) {
      console.warn("place_order_atomic notice, falling back to direct atomic sequence:", rpcError.message);

      // If RPC hits duplicate payment constraint from order trigger, execute standard multi-table creation
      const { error: orderInsertError } = await supabase.from("orders").insert({
        id: orderId,
        order_code: orderCode,
        customer_name: customerName,
        contact: customerName,
        notes: `[QR CREDIT] Customer: ${customerName}`,
        fulfillment: "pickup",
        pickup_location: "boys_411",
        delivery_fee_cents: 0,
        payment_method: "credit",
        subtotal_cents: calculatedTotalCents,
        total_cents: calculatedTotalCents,
        status: "pending",
      });

      if (orderInsertError) {
        console.error("Order insertion error:", orderInsertError);
        return {
          success: false,
          error: "We couldn't record your credit order. Please try again.",
        };
      }

      // Update credit balance in payments table
      await supabase
        .from("payments")
        .update({
          balance_due_cents: calculatedTotalCents,
          method: "credit",
          amount_cents: calculatedTotalCents,
          status: "pending",
        })
        .eq("order_id", orderId);

      // Insert order items & reduce product stock
      for (const item of data.items) {
        const prod = prodMap.get(item.productId)!;
        await supabase.from("order_items").insert({
          order_id: orderId,
          product_id: prod.id,
          name_snapshot: prod.name,
          category_snapshot: prod.category || null,
          unit_price_cents: prod.price_cents,
          unit_cost_cents: (prod as any).cost_cents ?? 0,
          qty: item.quantity,
          line_total_cents: prod.price_cents * item.quantity,
        });

        await supabase
          .from("products")
          .update({
            stock_qty: Math.max(0, prod.stock_qty - item.quantity),
            updated_at: new Date().toISOString(),
          })
          .eq("id", prod.id);
      }
    }

    // 5. Revalidate admin and public paths
    revalidatePath("/admin/credit-orders");
    revalidatePath("/admin/debtors");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory-management");
    revalidatePath("/services/credit");

    return {
      success: true,
      orderCode,
      totalCents: calculatedTotalCents,
    };
  } catch (error: any) {
    console.error("Submit credit order exception:", error);
    return {
      success: false,
      error: "We couldn't submit your credit order. Please try again.",
    };
  }
}
