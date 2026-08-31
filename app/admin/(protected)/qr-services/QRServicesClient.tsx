"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  QrCode,
  Settings,
  Download,
  Printer as PrinterIcon,
  Save,
  Upload,
  Trash2,
  Check,
  CreditCard,
} from "lucide-react";
import { QR_SERVICES, type QRServiceKey } from "@/lib/qr";
import {
  saveOwnerGCashSettings,
  uploadOwnerGCashQR,
} from "@/app/services/gcash/actions";

export type QRServicesClientProps = {
  initialSiteUrl: string;
  initialQrUrls: Record<QRServiceKey, string>;
  initialGCashAccountName?: string;
  initialGCashAccountNumber?: string;
  initialGCashQrUrl?: string;
};

const TABS = [
  { id: "qr", label: "QR Codes", icon: QrCode },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export default function QRServicesClient({
  initialSiteUrl,
  initialQrUrls,
  initialGCashAccountName = "",
  initialGCashAccountNumber = "",
  initialGCashQrUrl = "",
}: QRServicesClientProps) {
  const [activeTab, setActiveTab] = useState<string>("qr");
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl);
  const [qrUrls] = useState(initialQrUrls);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  // GCash Settings State
  const [accountName, setAccountName] = useState(initialGCashAccountName);
  const [accountNumber, setAccountNumber] = useState(initialGCashAccountNumber);
  const [qrUrl, setQrUrl] = useState(initialGCashQrUrl);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string>("");
  const [gcashLoading, setGcashLoading] = useState(false);
  const [gcashSaved, setGcashSaved] = useState(false);

  const qrInputRef = useRef<HTMLInputElement>(null);

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

  const handleQrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation: Image files only (PNG, JPG, JPEG, WEBP)
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      showMessage("Please upload a valid image (PNG, JPG, or WEBP)", "error");
      return;
    }

    // File size validation: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      showMessage("Image file size must be less than 5MB", "error");
      return;
    }

    setQrFile(file);
    if (qrPreview) URL.revokeObjectURL(qrPreview);
    setQrPreview(URL.createObjectURL(file));
  };

  const handleRemoveQr = () => {
    setQrFile(null);
    if (qrPreview) URL.revokeObjectURL(qrPreview);
    setQrPreview("");
    setQrUrl("");
    if (qrInputRef.current) qrInputRef.current.value = "";
  };

  const handleSaveGCashSettings = async () => {
    setGcashLoading(true);
    setGcashSaved(false);
    try {
      let finalQrUrl = qrUrl;

      if (qrFile) {
        const formData = new FormData();
        formData.append("qrFile", qrFile);
        const uploadRes = await uploadOwnerGCashQR(formData);
        if (!uploadRes.success || !uploadRes.data?.url) {
          throw new Error(uploadRes.error || "Failed to upload QR image");
        }
        finalQrUrl = uploadRes.data.url;
        setQrUrl(finalQrUrl);
        setQrFile(null);
      }

      const res = await saveOwnerGCashSettings(accountName, accountNumber, finalQrUrl);
      if (!res.success) {
        throw new Error(res.error || "Failed to save GCash settings");
      }

      setGcashSaved(true);
      showMessage("GCash receiving settings saved successfully!");
      setTimeout(() => setGcashSaved(false), 5000);
    } catch (err: any) {
      showMessage(err?.message || "Failed to save GCash settings", "error");
    } finally {
      setGcashLoading(false);
    }
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
                placeholder="https://quiet-handlers.vercel.app"
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
        <div className="space-y-6 max-w-4xl">
          {/* SECTION 1: QR DESTINATION */}
          <div className="rounded-2xl border-2 border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold uppercase tracking-wider text-stone-900">QR DESTINATION</h3>
            <p className="mt-1 mb-4 text-xs text-stone-500">
              Set the production domain used when generating QR codes.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://quiet-handlers.vercel.app"
                className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 font-medium"
              />
              <button
                onClick={() => saveSetting("site_url", siteUrl.trim())}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-900 transition shadow-sm"
              >
                <Save className="h-4 w-4" /> SAVE
              </button>
            </div>
          </div>

          {/* SECTION 2: GCASH RECEIVING ACCOUNT */}
          <div className="rounded-2xl border-2 border-stone-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-700" />
                <h3 className="text-base font-bold uppercase tracking-wider text-stone-900">
                  GCASH RECEIVING ACCOUNT
                </h3>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Configure the GCash account customers use when sending money.
              </p>
            </div>

            {gcashSaved && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                GCash receiving settings saved and synchronized across Tenpesorun!
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  ACCOUNT NAME
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. TENPESORUN DORM STORE"
                  className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-sm focus:border-amber-700 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  GCASH NUMBER
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  maxLength={11}
                  className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-sm font-mono font-bold tracking-wider focus:border-amber-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Owner GCash Receiving QR Section */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                GCASH RECEIVING QR
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-2xl border-2 border-stone-200 bg-stone-50 p-5">
                {qrPreview || qrUrl ? (
                  <div className="relative">
                    <img
                      src={qrPreview || qrUrl}
                      alt="Owner GCash Receiving QR"
                      className="h-36 w-36 rounded-xl border-2 border-stone-200 bg-white p-1.5 object-contain shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="h-36 w-36 rounded-xl border-2 border-dashed border-stone-300 bg-stone-100 flex flex-col items-center justify-center text-stone-400">
                    <QrCode className="h-10 w-10 mb-1" />
                    <span className="text-xs font-semibold">No QR uploaded</span>
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  <input
                    type="file"
                    ref={qrInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleQrFileSelect}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-900 shadow-sm transition"
                    >
                      <Upload className="h-4 w-4" />
                      {qrUrl || qrPreview ? "REPLACE QR" : "UPLOAD GCASH QR"}
                    </button>

                    {(qrUrl || qrPreview) && (
                      <button
                        type="button"
                        onClick={handleRemoveQr}
                        className="flex items-center gap-1.5 rounded-xl bg-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-300 transition"
                      >
                        <Trash2 className="h-4 w-4" /> REMOVE
                      </button>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-stone-500">
                    Used for Cash Out transactions.
                    <br />
                    Customers can download this QR or copy your GCash number when sending money to you.
                  </p>
                </div>
              </div>
            </div>

            {/* Save CTA */}
            <button
              type="button"
              onClick={handleSaveGCashSettings}
              disabled={gcashLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-amber-900 active:scale-[0.99] disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              {gcashLoading ? "Saving GCash Settings..." : "SAVE GCASH SETTINGS"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
