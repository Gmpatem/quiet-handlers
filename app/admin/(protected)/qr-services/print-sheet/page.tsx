import { Metadata } from "next";
import { resolveProductionBaseUrl, getAllServiceQrDataUrls } from "@/lib/qr-server";
import PrintSheetClient from "./PrintSheetClient";

export const metadata: Metadata = {
  title: "Print QR Sheet | Tenpesorun",
};

export const dynamic = "force-dynamic";

export default async function PrintSheetPage() {
  const baseUrl = await resolveProductionBaseUrl().catch(() => "");
  const qrUrls = await getAllServiceQrDataUrls(baseUrl).catch(() => ({
    print: "",
    borrow: "",
    gcash: "",
  }));

  return <PrintSheetClient baseUrl={baseUrl} qrUrls={qrUrls} />;
}
