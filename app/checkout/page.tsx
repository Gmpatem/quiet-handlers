// app/checkout/page.tsx (Server Component)
import { supabaseServer } from "@/lib/supabaseServer";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes at edge

export default async function CheckoutPage() {
  const supabase = await supabaseServer();

  // Fetch checkout config from combined RPC (1 query instead of 2!)
  const { data: config, error } = await supabase.rpc("get_checkout_config");

  if (error) {
    console.error("Failed to load checkout config:", error);
  }

  // Parse settings (JSONB is auto-parsed by Supabase)
  const settings = config?.settings || {};
  const paymentEnums = config?.payment_enums || ["pending"];

  // Extract and provide defaults
  const initialSettings = {
    deliveryFeeCents: settings.delivery_fee_cents || 1500,
    enableGCash: settings.enable_gcash ?? settings.gcash_enabled ?? true,
    enableCOD: settings.enable_cod ?? true,
    enableDelivery: settings.enable_delivery ?? true,
    enablePickup: settings.enable_pickup ?? true,
    gcashName: settings.gcash_name || "",
    gcashNumber: settings.gcash_number || "",
    gcashInstructions: settings.gcash_instructions || "",
  };

  return (
    <CheckoutClient
      initialSettings={initialSettings}
      paymentEnums={paymentEnums}
    />
  );
}
