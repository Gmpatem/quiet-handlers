import { supabaseServer } from "@/lib/supabaseServer";
import QRServicesClient from "./QRServicesClient";
import { resolveProductionBaseUrl, getAllServiceQrDataUrls } from "@/lib/qr-server";

export const dynamic = "force-dynamic";

export default async function QRServicesPage() {
  const supabase = await supabaseServer();

  const [appSettings, baseUrl, qrUrls] = await Promise.all([
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "site_url",
        "gcash_account_name",
        "gcash_account_number",
        "gcash_qr_url",
      ])
      .then((r) => r.data ?? []),
    resolveProductionBaseUrl().catch(() => ""),
    getAllServiceQrDataUrls().catch(() => ({ print: "", gcash: "", credit: "", store: "" })),
  ]);

  const settingsMap = new Map<string, unknown>();
  for (const s of appSettings) settingsMap.set(s.key, s.value);

  const siteUrl = String(settingsMap.get("site_url") ?? "").trim() || baseUrl || "";
  const gcashAccountName = String(settingsMap.get("gcash_account_name") ?? "");
  const gcashAccountNumber = String(settingsMap.get("gcash_account_number") ?? "");
  const gcashQrUrl = String(settingsMap.get("gcash_qr_url") ?? "");

  return (
    <QRServicesClient
      initialSiteUrl={siteUrl}
      initialQrUrls={qrUrls}
      initialGCashAccountName={gcashAccountName}
      initialGCashAccountNumber={gcashAccountNumber}
      initialGCashQrUrl={gcashQrUrl}
    />
  );
}
