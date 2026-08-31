"use client";

import { useState, useEffect, useMemo } from "react";
import { Printer, User, FileText, CheckCircle, Minus, Plus, Send, X } from "lucide-react";
import {
  calculatePrintPrice,
  formatPeso,
  type PrintPricingSettings,
  type ColorType,
  type PaperSize,
  type SidedType,
} from "@/lib/printing/pricing";

export type PrintingServiceClientProps = {
  initialSettings: PrintPricingSettings;
};

export default function PrintingServiceClient({ initialSettings }: PrintingServiceClientProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [colorType, setColorType] = useState<ColorType>("bw");
  const [paperSize, setPaperSize] = useState<PaperSize>("a4");
  const [copies, setCopies] = useState(1);
  const [sided, setSided] = useState<SidedType>("single");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ requestId: string } | null>(null);

  const settings = initialSettings;

  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem("fds_user_name");
    if (savedName) setName(savedName);
  }, []);

  const pricing = useMemo(
    () => calculatePrintPrice(settings, colorType, paperSize, copies, sided),
    [settings, colorType, paperSize, copies, sided]
  );

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "application/pdf") {
      setPdfFile(file);
      setError("");
    } else {
      setError("Please upload a PDF file");
      e.target.value = "";
    }
  };

  const adjustCopies = (delta: number) => {
    setCopies((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!pdfFile) {
      setError("Please upload a PDF file");
      return;
    }

    setIsSubmitting(true);

    try {
      localStorage.setItem("fds_user_name", name);

      const formData = new FormData();
      formData.append("studentName", name);
      formData.append("serviceType", "print");
      formData.append("colorType", colorType);
      formData.append("paperSize", paperSize);
      formData.append("pages", "1");
      formData.append("copies", copies.toString());
      formData.append("sided", sided);
      formData.append("binding", "false");
      formData.append("specialInstructions", "");
      formData.append("paymentMethod", "cash");
      formData.append("totalAmount", pricing.total.toString());
      formData.append("pdfFile", pdfFile);

      const { submitCompletePrintingRequest } = await import("@/app/services/printing/actions");
      const result = await submitCompletePrintingRequest(formData);

      if (result.success) {
        setSuccess({ requestId: result.requestId?.slice(0, 8) || "" });
        setPdfFile(null);
        setCopies(1);
        setSided("single");
        setColorType("bw");
        setPaperSize("a4");
        const fileInput = document.querySelector<HTMLInputElement>("input[type=file]");
        if (fileInput) fileInput.value = "";
      } else {
        setError(result.error || "Failed to submit request");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-700" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Printing request received</h2>
          <p className="mt-1 text-sm text-stone-600">Request #{success.requestId}</p>
          <button
            onClick={() => setSuccess(null)}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 py-3 font-semibold text-white shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white px-4 pb-28 pt-6">
      <div className="mx-auto max-w-sm">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">PRINT HERE</h1>
            <p className="text-sm text-stone-500">Fast. Simple. Done.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-stone-700">
              Your Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                required
              />
            </div>
          </div>

          {/* PDF Upload */}
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-stone-700">
              PDF File
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                className="w-full rounded-xl border border-stone-200 bg-white py-[9px] pl-10 pr-4 text-sm text-stone-900 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-amber-800 hover:file:bg-amber-200 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                required
              />
            </div>
            {pdfFile && (
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="font-medium">{pdfFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPdfFile(null);
                    const input = document.querySelector<HTMLInputElement>("input[type=file]");
                    if (input) input.value = "";
                  }}
                  className="ml-auto text-stone-400 hover:text-stone-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Requirements Card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-700">
              Printing Requirements
            </h2>

            <div className="space-y-4">
              {/* Color Mode */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-700">Color Mode</span>
                <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-1">
                  {(["bw", "color"] as ColorType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setColorType(type)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        colorType === type
                          ? "bg-amber-700 text-white shadow-sm"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {type === "bw" ? "B&W" : "COLOR"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Size */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-700">Paper Size</span>
                <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-1">
                  {(["a4", "long", "a3"] as PaperSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPaperSize(size)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${
                        paperSize === size
                          ? "bg-amber-700 text-white shadow-sm"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copies */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-700">Copies</span>
                <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => adjustCopies(-1)}
                    className="touch-target flex items-center justify-center rounded-lg bg-stone-100 p-2 text-stone-700 transition hover:bg-stone-200"
                    aria-label="Decrease copies"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-stone-900">{copies}</span>
                  <button
                    type="button"
                    onClick={() => adjustCopies(1)}
                    className="touch-target flex items-center justify-center rounded-lg bg-stone-100 p-2 text-stone-700 transition hover:bg-stone-200"
                    aria-label="Increase copies"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sides */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-700">Sides</span>
                <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-1">
                  {(["single", "double"] as SidedType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSided(type)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${
                        sided === type
                          ? "bg-amber-700 text-white shadow-sm"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Price Breakdown
            </h2>
            <div className="space-y-2">
              {pricing.lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-stone-700">{item.label}</span>
                  <span className="font-medium text-stone-900">{formatPeso(item.amount)}</span>
                </div>
              ))}
              <div className="my-2 h-px bg-amber-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-amber-900">
                  {colorType === "color" ? "Estimated Price" : "Total Price"}
                </span>
                <span className="text-xl font-bold text-amber-800">
                  {colorType === "color" ? `Starts at ${formatPeso(pricing.total)}` : formatPeso(pricing.total)}
                </span>
              </div>
              {colorType === "color" && (
                <p className="mt-1 text-xs text-amber-700">
                  Final color price may vary depending on content.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="fixed bottom-4 left-4 right-4 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60 sm:static sm:w-full"
          >
            <Send className="h-5 w-5" />
            {isSubmitting ? "Submitting..." : "SUBMIT PRINT REQUEST"}
          </button>
        </form>
      </div>
    </div>
  );
}
