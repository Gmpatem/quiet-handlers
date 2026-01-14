import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export type PublicSettings = Record<string, any>;

export async function getPublicSettings(): Promise<PublicSettings> {
  const supabase = await supabaseServer();

  // Your app_settings has: key, value (jsonb). No is_public column.
  // So we just read everything; later if you add is_public we can filter.
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  if (error) {
    // Fail soft: storefront should still render
    return {};
  }

  const settings: PublicSettings = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return settings;
}
