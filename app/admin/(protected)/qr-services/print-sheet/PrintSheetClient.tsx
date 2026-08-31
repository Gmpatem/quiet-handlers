"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { QR_SERVICES, type QRServiceKey } from "@/lib/qr";

export type PrintSheetClientProps = {
  baseUrl: string;
  qrUrls: Record<QRServiceKey, string>;
};

export default function PrintSheetClient({ baseUrl, qrUrls }: PrintSheetClientProps) {
  return (
    <div className="qr-print-sheet">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          aside, nav, .qr-print-controls, button, a[href] {
            display: none !important;
          }
          body > div > div {
            display: block !important;
            max-width: none !important;
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
          .qr-print-sheet {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
          }
          .qr-sheet-card {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #d6d3d1 !important;
          }
        }
      `}</style>

      {/* Controls - hidden when printing */}
      <div className="qr-print-controls mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Print QR Sheet</h1>
          <p className="text-sm text-stone-500">A4 portrait · {baseUrl || "URL not configured"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/qr-services"
            className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-amber-800 hover:to-amber-950"
          >
            <Printer className="h-4 w-4" /> Print A4
          </button>
        </div>
      </div>

      {/* A4 Sheet */}
      <div className="mx-auto max-w-[210mm] bg-white p-6 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-stone-600 to-amber-900 text-lg font-bold text-white">
            FDS
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Scan a Service</h2>
          <p className="text-sm text-stone-500">Point your phone camera at any code</p>
        </div>

        <div className="grid gap-6">
          {QR_SERVICES.map((service) => (
            <div
              key={service.key}
              className="qr-sheet-card flex items-center gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-2xl text-amber-800">
                {service.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-stone-900">{service.title}</h3>
                <p className="text-sm text-stone-500">{service.instruction}</p>
                <p className="mt-1 break-all text-xs text-stone-400">
                  {baseUrl}
                  {service.path}
                </p>
              </div>
              <div className="flex-shrink-0">
                {qrUrls[service.key] ? (
                  <img
                    src={qrUrls[service.key]}
                    alt={`${service.title} QR`}
                    className="h-28 w-28 rounded-xl sm:h-32 sm:w-32"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-stone-100 text-xs text-stone-500 sm:h-32 sm:w-32">
                    No QR
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-stone-400">
          Powered by Tenpesorun · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
