import { Metadata } from "next";
import PrintingServiceClient from "@/components/printing/PrintingServiceClient";
import { getPrintPricingSettings } from "@/lib/printing/pricing-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print Here | Tenpesorun",
  description: "Fast, simple printing requests.",
};

export default async function PrintServicePage() {
  const settings = await getPrintPricingSettings();
  return <PrintingServiceClient initialSettings={settings} />;
}
