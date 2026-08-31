import QRCode from "qrcode";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { QR_SERVICES, QR_SERVICE_PATHS, type QRServiceKey } from "@/lib/qr";

export async function resolveProductionBaseUrl(): Promise<string> {
  try {
    // 1. Manager-configured setting
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "site_url")
      .single();

    const configured = data?.value ? String(data.value).trim() : "";
    if (configured && configured.startsWith("http")) {
      return configured.replace(/\/$/, "");
    }
  } catch (err) {
    console.error("Failed to load site_url setting:", err);
  }

  // 2. Environment variable
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (envUrl) {
    const url = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
    return url.replace(/\/$/, "");
  }

  // 3. Request headers fallback (server-only)
  try {
    const h = await headers();
    const host = h.get("host");
    const protocol = h.get("x-forwarded-proto") === "https" ? "https" : "http";
    if (host) {
      return `${protocol}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // headers() throws in client context; ignore
  }

  return "";
}

export async function getServiceQrDataUrl(
  serviceKey: QRServiceKey,
  baseUrl?: string
): Promise<string> {
  const path = QR_SERVICE_PATHS[serviceKey];
  const origin = baseUrl || (await resolveProductionBaseUrl());
  if (!origin) {
    throw new Error("Could not resolve production base URL for QR code");
  }
  const url = `${origin}${path}`;
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

export async function getAllServiceQrDataUrls(
  baseUrl?: string
): Promise<Record<QRServiceKey, string>> {
  const origin = baseUrl || (await resolveProductionBaseUrl());
  const entries = await Promise.all(
    QR_SERVICES.map(async (service) => {
      const url = `${origin}${service.path}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      return [service.key, dataUrl] as const;
    })
  );
  return Object.fromEntries(entries) as Record<QRServiceKey, string>;
}
