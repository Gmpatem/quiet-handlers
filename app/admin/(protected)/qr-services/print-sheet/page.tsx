import { Metadata } from "next";
import { resolveProductionBaseUrl, getAllServiceQrDataUrls } from "@/lib/qr-server";
import { supabaseServer } from "@/lib/supabaseServer";
import PrintSheetClient from "./PrintSheetClient";

export const metadata: Metadata = {
  title: "Print QR Sheet | Tenpesorun",
};

export const dynamic = "force-dynamic";

export default async function PrintSheetPage() {
  const supabase = await supabaseServer();

  const [baseUrl, qrUrls, appSettings] = await Promise.all([
    resolveProductionBaseUrl().catch(() => ""),
    getAllServiceQrDataUrls().catch(() => ({
      print: "",
      gcash: "",
      credit: "",
      store: "",
    })),
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["gcash_account_name", "gcash_account_number", "gcash_qr_url"])
      .then((r) => r.data ?? []),
  ]);

  const settingsMap = new Map<string, unknown>();
  for (const s of appSettings) settingsMap.set(s.key, s.value);

  const gcashAccountName = String(settingsMap.get("gcash_account_name") ?? "");
  const gcashAccountNumber = String(settingsMap.get("gcash_account_number") ?? "");
  const gcashQrUrl = String(settingsMap.get("gcash_qr_url") ?? "");

  return (
    <PrintSheetClient
      baseUrl={baseUrl}
      qrUrls={qrUrls}
      gcashAccountName={gcashAccountName}
      gcashAccountNumber={gcashAccountNumber}
      gcashQrUrl={gcashQrUrl}
    />
  );
}
