import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_PRINT_PRICING,
  type PrintPricingSettings,
} from "./pricing";

export async function getPrintPricingSettings(): Promise<PrintPricingSettings> {
  try {
    const supabase = await supabaseServer();
    const keys = Object.keys(DEFAULT_PRINT_PRICING);
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", keys);

    if (error) throw error;

    const settings = { ...DEFAULT_PRINT_PRICING };
    for (const row of data ?? []) {
      const key = row.key as keyof PrintPricingSettings;
      if (key in DEFAULT_PRINT_PRICING) {
        const num = Number(row.value);
        if (!Number.isNaN(num)) {
          settings[key] = num;
        }
      }
    }
    return settings;
  } catch (err) {
    console.error("Failed to load print pricing settings:", err);
    return { ...DEFAULT_PRINT_PRICING };
  }
}
