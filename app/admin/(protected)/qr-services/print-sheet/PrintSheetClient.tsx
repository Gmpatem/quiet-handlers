"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { QR_SERVICES, type QRServiceKey } from "@/lib/qr";

export type PrintSheetClientProps = {
  baseUrl: string;
  qrUrls: Record<QRServiceKey, string>;
  gcashAccountName?: string;
  gcashAccountNumber?: string;
  gcashQrUrl?: string;
};

export default function PrintSheetClient({
  baseUrl,
  qrUrls,
  gcashAccountName = "",
  gcashAccountNumber = "",
  gcashQrUrl = "",
}: PrintSheetClientProps) {
  return (
    <div className="min-h-screen bg-stone-100 p-3 sm:p-6 print:min-h-0 print:p-0 print:bg-white">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          aside, nav, .qr-print-controls, button, a[href] {
            display: none !important;
          }
          body > div > div {
            display: block !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          main {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: white !important;
            box-shadow: none !important;
          }
          .qr-a4-page {
            width: 100% !important;
            max-width: 194mm !important;
            height: auto !important;
            max-height: 284mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
          }
          .qr-card-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Controls - Hidden when printing */}
      <div className="qr-print-controls mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-stone-900">Print QR Sheet</h1>
          <p className="text-xs text-stone-500">
            1 Single A4 Page · 5 QR Codes (2 + 2 + 1) · {baseUrl || "https://quiet-handlers.vercel.app"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/qr-services"
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-amber-800 hover:to-amber-950 transition active:scale-95"
          >
            <Printer className="h-4 w-4" /> Print A4 Sheet
          </button>
        </div>
      </div>

      {/* Printable Single A4 Page Container */}
      <div className="qr-a4-page mx-auto max-w-[210mm] rounded-3xl bg-white p-4 sm:p-5 shadow-lg border border-stone-200 flex flex-col justify-between">
        {/* Header (Compact ~18mm) */}
        <div className="mb-2.5 text-center border-b border-stone-100 pb-2">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-xs font-black text-white">
              FDS
            </span>
            <h2 className="text-lg font-black tracking-tight text-stone-900 uppercase">
              Tenpesorun QR Services
            </h2>
          </div>
          <p className="text-[11px] font-medium text-stone-500 mt-0.5">
            Scan any service with your phone camera or scan GCash Payment with GCash
          </p>
        </div>

        {/* 2 + 2 + 1 Grid Layout (Guaranteed single A4 page fit) */}
        <div className="space-y-2.5">
          {/* ROW 1: PRINT HERE | GCASH HERE */}
          <div className="grid grid-cols-2 gap-2.5">
            {QR_SERVICES.slice(0, 2).map((service) => (
              <div
                key={service.key}
                className="qr-card-item flex flex-col items-center justify-between rounded-xl border border-stone-300 bg-white p-2.5 text-center"
              >
                <div className="w-full">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-base">{service.icon}</span>
                    <h3 className="text-xs font-black tracking-wide text-stone-900">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-[10px] font-bold text-amber-800 mt-0.5">
                    {service.instruction}
                  </p>
                </div>

                <div className="my-1.5 flex items-center justify-center">
                  {qrUrls[service.key] ? (
                    <img
                      src={qrUrls[service.key]}
                      alt={`${service.title} QR`}
                      className="h-28 w-28 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-stone-100 text-[10px] text-stone-400">
                      No QR
                    </div>
                  )}
                </div>

                <p className="truncate w-full text-[9px] font-mono text-stone-400">
                  {baseUrl}
                  {service.path}
                </p>
              </div>
            ))}
          </div>

          {/* ROW 2: TAKE ON CREDIT | SHOP HERE */}
          <div className="grid grid-cols-2 gap-2.5">
            {QR_SERVICES.slice(2, 4).map((service) => (
              <div
                key={service.key}
                className="qr-card-item flex flex-col items-center justify-between rounded-xl border border-stone-300 bg-white p-2.5 text-center"
              >
                <div className="w-full">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-base">{service.icon}</span>
                    <h3 className="text-xs font-black tracking-wide text-stone-900">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-[10px] font-bold text-amber-800 mt-0.5">
                    {service.instruction}
                  </p>
                </div>

                <div className="my-1.5 flex items-center justify-center">
                  {qrUrls[service.key] ? (
                    <img
                      src={qrUrls[service.key]}
                      alt={`${service.title} QR`}
                      className="h-28 w-28 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-stone-100 text-[10px] text-stone-400">
                      No QR
                    </div>
                  )}
                </div>

                <p className="truncate w-full text-[9px] font-mono text-stone-400">
                  {baseUrl}
                  {service.path}
                </p>
              </div>
            ))}
          </div>

          {/* ROW 3: GCASH PAYMENT (Actual Owner GCash Receiving QR - Horizontal / Balanced Emphasis) */}
          <div className="qr-card-item rounded-xl border-2 border-amber-400 bg-amber-50/40 p-3 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              {/* QR Image */}
              <div className="flex-shrink-0 flex items-center justify-center">
                {gcashQrUrl ? (
                  <img
                    src={gcashQrUrl}
                    alt="GCash Payment QR"
                    className="h-28 w-28 rounded-lg object-contain border border-amber-300 bg-white shadow-2xs"
                  />
                ) : (
                  <div className="flex h-28 w-28 flex-col items-center justify-center rounded-lg bg-white border border-stone-200 p-2 text-center text-[10px] text-stone-400">
                    <span>No Receiving QR Configured</span>
                  </div>
                )}
              </div>

              {/* Payment Details */}
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-800 px-2 py-0.5 text-white shadow-2xs mb-1">
                  <span className="text-xs">💳</span>
                  <h3 className="text-xs font-black tracking-wide uppercase">GCASH PAYMENT</h3>
                </div>
                <p className="text-xs font-black text-amber-950">Scan with GCash to pay</p>
                <div className="mt-1.5 space-y-0.5">
                  {gcashAccountName && (
                    <p className="text-xs font-bold text-stone-900">
                      Account: <span className="font-extrabold">{gcashAccountName}</span>
                    </p>
                  )}
                  {gcashAccountNumber && (
                    <p className="text-xs font-mono font-black text-stone-900">
                      Number: <span className="tracking-wider">{gcashAccountNumber}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (~8mm) */}
        <div className="mt-2 text-center text-[9px] text-stone-400 font-semibold border-t border-stone-100 pt-1.5">
          Tenpesorun · Room 411 · All 5 Services Active
        </div>
      </div>
    </div>
  );
}
