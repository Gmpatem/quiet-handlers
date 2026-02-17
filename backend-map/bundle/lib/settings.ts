import { supabaseBrowser } from "@/lib/supabase/browser";

export type AppSetting = { key: string; value: any };

export async function getAppSettings(keys: string[]) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from("app_settings").select("key,value").in("key", keys);

  if (error) throw new Error(error.message);

  const map = new Map<string, any>();
  for (const row of (data ?? []) as AppSetting[]) map.set(row.key, row.value);
  return map;
}
