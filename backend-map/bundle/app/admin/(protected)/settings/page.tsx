import { supabaseServer } from "@/lib/supabaseServer";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await supabaseServer();

  const { data: settings, error: sErr } = await supabase
    .from("app_settings")
    .select("key, value")
    .order("key", { ascending: true });

  if (sErr) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-red-600">
          Failed to load app_settings: {sErr.message}
        </p>
      </div>
    );
  }

  const { data: meta, error: mErr } = await supabase
    .from("settings_meta")
    .select("key, section, label, description, input_type, sort_order")
    .order("section", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true });

  if (mErr) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-red-600">
          Failed to load settings_meta: {mErr.message}
        </p>
      </div>
    );
  }

  return <SettingsClient initialSettings={settings ?? []} initialMeta={meta ?? []} />;
}

