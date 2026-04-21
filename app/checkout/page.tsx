// app/checkout/page.tsx (Server Component)
import { supabaseServer } from "@/lib/supabaseServer";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes at edge

export default async function CheckoutPage() {
  const supabase = await supabaseServer();

  const settingKeys = [
    "delivery_fee_cents",
    "enable_gcash",
    "enable_cod",
    "enable_delivery",
    "enable_pickup",
    "gcash_enabled",
    "gcash_name",
    "gcash_number",
    "gcash_instructions",
  ];

  const { data: rawSettings, error: settingsError } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", settingKeys);

  if (settingsError) {
    console.error("Failed to load checkout settings:", settingsError);
  }

  const settings = Object.fromEntries(
    (rawSettings ?? []).map((row: any) => [row.key, row.value])
  ) as Record<string, any>;

  const { data: enumValues, error: enumError } = await supabase.rpc(
    "get_payment_status_enum"
  );
  if (enumError) {
    console.error("Failed to load payment status enum:", enumError);
  }
  const paymentEnums =
    Array.isArray(enumValues) && enumValues.length > 0
      ? enumValues.map(String)
      : ["pending"];

  // Extract and provide defaults
  const initialSettings = {
    deliveryFeeCents: Number(settings.delivery_fee_cents ?? 1500),
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
