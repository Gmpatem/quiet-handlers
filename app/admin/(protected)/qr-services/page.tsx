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
      .then((r) => r.data ?? []),
    resolveProductionBaseUrl().catch(() => ""),
    getAllServiceQrDataUrls().catch(() => ({ print: "", borrow: "", gcash: "" })),
  ]);

  const settingsMap = new Map<string, unknown>();
  for (const s of appSettings) settingsMap.set(s.key, s.value);

  const siteUrl = String(settingsMap.get("site_url") ?? "").trim() || baseUrl || "";

  return <QRServicesClient initialSiteUrl={siteUrl} initialQrUrls={qrUrls} />;
}
