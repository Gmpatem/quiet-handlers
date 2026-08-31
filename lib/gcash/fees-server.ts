import { supabaseServer } from "@/lib/supabaseServer";
import {
  parseFeeRules,
  DEFAULT_GCASH_FEE_RULES,
  type GCashFeeSettings,
} from "./fees";

export async function getGCashSettings(): Promise<GCashFeeSettings> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["gcash_fee_rules", "gcash_account_name", "gcash_account_number", "gcash_qr_url"]);

    if (error) throw error;

    const map = new Map<string, unknown>();
    for (const row of data ?? []) {
      map.set(row.key, row.value);
    }

    return {
      gcash_fee_rules: parseFeeRules(map.get("gcash_fee_rules")),
      gcash_account_name: String(map.get("gcash_account_name") ?? ""),
      gcash_account_number: String(map.get("gcash_account_number") ?? ""),
      gcash_qr_url: String(map.get("gcash_qr_url") ?? ""),
    };
  } catch (err) {
    console.error("Failed to load GCash settings:", err);
    return {
      gcash_fee_rules: DEFAULT_GCASH_FEE_RULES,
      gcash_account_name: "",
      gcash_account_number: "",
      gcash_qr_url: "",
    };
  }
}
