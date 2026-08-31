"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  QrCode,
  Settings,
  Download,
  Printer as PrinterIcon,
  Save,
} from "lucide-react";
import { QR_SERVICES, type QRServiceKey } from "@/lib/qr";

export type QRServicesClientProps = {
  initialSiteUrl: string;
  initialQrUrls: Record<QRServiceKey, string>;
};

const TABS = [
  { id: "qr", label: "QR Codes", icon: QrCode },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export default function QRServicesClient({
  initialSiteUrl,
  initialQrUrls,
}: QRServicesClientProps) {
  const [activeTab, setActiveTab] = useState<string>("qr");
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl);
  const [qrUrls] = useState(initialQrUrls);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const showMessage = (text: string, tone: "success" | "error" = "success") => {
    setMessage({ text, tone });
    setTimeout(() => setMessage(null), 4000);
  };

  const saveSetting = async (key: string, value: unknown) => {
    try {
      const { error } = await supabaseBrowser().from("app_settings").update({ value }).eq("key", key);
      if (error) throw error;
      showMessage("Setting saved");
    } catch (err: any) {
      showMessage(err?.message || "Failed to save", "error");
    }
  };

  const downloadQr = (key: QRServiceKey) => {
    const url = qrUrls[key];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${key}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">QR Services</h1>
        <p className="text-sm text-stone-500">Generate QR codes and manage QR destinations</p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl border p-3 text-sm font-medium ${
            message.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-stone-200 pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-b-2 border-amber-700 text-amber-800"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "qr" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-semibold text-stone-700">Production site URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://your-domain.com"
                className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              />
              <button
                onClick={() => saveSetting("site_url", siteUrl.trim())}
                className="flex items-center gap-1 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              QR codes encode: {siteUrl || "<not configured>"}
              {siteUrl && QR_SERVICES.map((s) => `${siteUrl}${s.path}`).join(", ")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {QR_SERVICES.map((service) => (
              <div
                key={service.key}
                className="rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-sm"
              >
                <div className="mb-3 text-2xl">{service.icon}</div>
                <h3 className="font-bold text-stone-900">{service.title}</h3>
                <p className="mb-3 text-xs text-stone-500">{service.instruction}</p>
                {qrUrls[service.key] ? (
                  <img
                    src={qrUrls[service.key]}
                    alt={`${service.title} QR`}
                    className="mx-auto mb-3 h-40 w-40 rounded-xl"
                  />
                ) : (
                  <div className="mx-auto mb-3 flex h-40 w-40 items-center justify-center rounded-xl bg-stone-100 text-sm text-stone-500">
                    No QR
                  </div>
                )}
                <p className="mb-3 truncate text-xs text-stone-400">
                  {siteUrl}
                  {service.path}
                </p>
                <button
                  onClick={() => downloadQr(service.key)}
                  className="flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Link
              href="/admin/qr-services/print-sheet"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-3 font-semibold text-white shadow-md"
            >
              <PrinterIcon className="h-4 w-4" /> Print QR Sheet (A4)
            </Link>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900">QR Destination</h3>
          <p className="mb-4 text-sm text-stone-500">
            Set the production domain used when generating QR codes.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://your-domain.com"
              className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
            />
            <button
              onClick={() => saveSetting("site_url", siteUrl.trim())}
              className="flex items-center gap-1 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              <Save className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
