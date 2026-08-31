import { Metadata } from "next";
import GCashServiceClient from "@/components/gcash/GCashServiceClient";
import { getGCashSettings } from "@/lib/gcash/fees-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GCash Here | Tenpesorun",
  description: "Cash In or Cash Out",
};

export default async function GCashServicePage() {
  const settings = await getGCashSettings();
  return <GCashServiceClient initialSettings={settings} />;
}
