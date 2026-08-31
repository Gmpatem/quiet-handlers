"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Wallet,
  CheckCircle,
  Banknote,
  ArrowRightLeft,
  Upload,
  Send,
  X,
  Copy,
  Check,
  Download,
  QrCode,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  calculateGCashFee,
  formatPeso,
  type GCashFeeSettings,
  type GCashTransactionType,
} from "@/lib/gcash/fees";

export type GCashServiceClientProps = {
  initialSettings: GCashFeeSettings;
};

type CashInRecipientMode = "qr" | "number";

export default function GCashServiceClient({ initialSettings }: GCashServiceClientProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [transactionType, setTransactionType] = useState<GCashTransactionType>("cash_in");
  const [amount, setAmount] = useState("");
  const [studentName, setStudentName] = useState("");
  
  // Cash In recipient details (Customer's destination)
  const [cashInMode, setCashInMode] = useState<CashInRecipientMode>("number");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerQrFile, setCustomerQrFile] = useState<File | null>(null);
  const [customerQrPreview, setCustomerQrPreview] = useState<string>("");

  // Cash Out details (Customer sends to Owner)
  const [cashOutRef, setCashOutRef] = useState("");
  const [cashOutContact, setCashOutContact] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string>("");

  // UI state
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ requestId: string } | null>(null);

  const qrInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const settings = initialSettings;

  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem("fds_user_name");
    if (savedName) setStudentName(savedName);
  }, []);

  const calculation = useMemo(() => {
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return null;
    return calculateGCashFee(settings.gcash_fee_rules, num);
  }, [amount, settings.gcash_fee_rules]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (customerQrPreview) URL.revokeObjectURL(customerQrPreview);
      if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
    };
  }, [customerQrPreview, paymentProofPreview]);

  const handleCustomerQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setCustomerQrFile(file);
    if (customerQrPreview) URL.revokeObjectURL(customerQrPreview);
    setCustomerQrPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setPaymentProofFile(file);
    if (paymentProofPreview) URL.revokeObjectURL(paymentProofPreview);
    setPaymentProofPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleCopyOwnerNumber = async () => {
    if (!settings.gcash_account_number) return;
    try {
      await navigator.clipboard.writeText(settings.gcash_account_number);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadOwnerQr = () => {
    if (!settings.gcash_qr_url) return;
    const a = document.createElement("a");
    a.href = settings.gcash_qr_url;
    a.download = `gcash-qr-${settings.gcash_account_number || "owner"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Step navigation validations
  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!calculation || calculation.amount <= 0) {
        setError("Please enter a valid amount");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!studentName.trim()) {
        setError("Please enter your name");
        return;
      }

      if (transactionType === "cash_in") {
        if (cashInMode === "number") {
          const clean = customerNumber.replace(/\s/g, "");
          if (!/^(09|\+639)\d{9}$/.test(clean)) {
            setError("Please enter a valid Philippine mobile number (e.g. 09XXXXXXXXX)");
            return;
          }
        } else {
          if (!customerQrFile) {
            setError("Please upload your receiving GCash QR image");
            return;
          }
        }
      } else {
        // Cash Out
        if (!cashOutRef.trim() && !paymentProofFile) {
          setError("Please enter the GCash Reference Number or upload payment proof");
          return;
        }
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!calculation) return;
    setError("");
    setIsSubmitting(true);

    try {
      localStorage.setItem("fds_user_name", studentName.trim());

      const formData = new FormData();
      formData.append("studentName", studentName.trim());
      formData.append("transactionType", transactionType);
      formData.append("amount", calculation.amount.toString());

      if (transactionType === "cash_in") {
        if (cashInMode === "number") {
          formData.append("studentContact", customerNumber.replace(/\s/g, ""));
          formData.append("referenceNotes", `Cash In to GCash: ${customerNumber.trim()}`);
        } else {
          formData.append("studentContact", "QR Code Uploaded");
          formData.append("referenceNotes", "Cash In to Uploaded Customer QR");
          if (customerQrFile) {
            formData.append("paymentProof", customerQrFile);
          }
        }
      } else {
        // Cash Out
        const contact = cashOutContact.trim() || settings.gcash_account_number || "Counter";
        formData.append("studentContact", contact);
        formData.append(
          "referenceNotes",
          `Cash Out Ref: ${cashOutRef.trim() || "See Proof Screenshot"}`
        );
        if (paymentProofFile) {
          formData.append("paymentProof", paymentProofFile);
        }
      }

      const { submitCompleteGCashRequest } = await import("@/app/services/gcash/actions");
      const result = await submitCompleteGCashRequest(formData);

      if (result.success) {
        setSuccess({ requestId: result.requestId?.slice(0, 8) || "SUCCESS" });
      } else {
        setError(result.error || "Failed to submit request");
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-700" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Request Submitted!</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Reference ID: #{success.requestId}
          </p>

          <div className="my-6 rounded-2xl bg-amber-50/80 border border-amber-200 p-4 text-left text-sm text-stone-800 space-y-2">
            <p className="font-semibold text-amber-900">
              {transactionType === "cash_in" ? "💵 Cash In Steps:" : "💸 Cash Out Steps:"}
            </p>
            {transactionType === "cash_in" ? (
              <ol className="list-decimal list-inside space-y-1 text-xs text-stone-700">
                <li>Head to the counter / Room 411.</li>
                <li>Hand over {formatPeso(calculation?.finalAmount ?? 0)} physical cash.</li>
                <li>The owner will send {formatPeso(calculation?.amount ?? 0)} to your GCash.</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-xs text-stone-700">
                <li>Head to the counter / Room 411.</li>
                <li>Show your GCash transfer or Reference ID.</li>
                <li>Receive {formatPeso(calculation?.amount ?? 0)} physical cash from the owner.</li>
              </ol>
            )}
          </div>

          <button
            onClick={() => {
              setSuccess(null);
              setStep(1);
              setAmount("");
              setCustomerNumber("");
              setCustomerQrFile(null);
              setCustomerQrPreview("");
              setCashOutRef("");
              setPaymentProofFile(null);
              setPaymentProofPreview("");
            }}
            className="w-full rounded-xl bg-amber-800 py-3 text-sm font-semibold text-white shadow-md hover:bg-amber-900 active:scale-[0.98] transition"
          >
            New Transaction
          </button>
        </div>
      </div>
    );
  }

  const isOwnerConfigured = Boolean(settings.gcash_account_number || settings.gcash_qr_url);

  return (
    <div className="min-h-screen bg-stone-50 pb-12 pt-6 px-4">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center rounded-2xl bg-amber-100 p-3 text-amber-800 shadow-sm">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-stone-900">GCASH HERE</h1>
          <p className="mt-1 text-xs font-medium text-stone-600">
            Fast, secure Cash In & Cash Out wizard
          </p>
        </div>

        {/* Wizard Steps Progress Indicator */}
        <div className="mb-6 flex items-center justify-between px-2">
          {[
            { num: 1, label: "Details" },
            { num: 2, label: "GCash" },
            { num: 3, label: "Confirm" },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === s.num
                    ? "bg-amber-800 text-white shadow-md ring-2 ring-amber-800/30"
                    : step > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-200 text-stone-600"
                }`}
              >
                {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span
                className={`text-xs font-semibold ${
                  step === s.num ? "text-amber-900" : "text-stone-500"
                }`}
              >
                {s.label}
              </span>
              {idx < 2 && <div className="h-0.5 w-6 sm:w-10 bg-stone-200" />}
            </div>
          ))}
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ================= STEP 1: DETAILS ================= */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Type Switcher */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
                  Select Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionType("cash_in");
                      setError("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition ${
                      transactionType === "cash_in"
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <Banknote className="h-4 w-4 text-emerald-600" />
                    Cash In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionType("cash_out");
                      setError("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition ${
                      transactionType === "cash_out"
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                    Cash Out
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    {transactionType === "cash_in"
                      ? "GCash You Want to Receive"
                      : "Physical Cash You Want"}
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-stone-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError("");
                    }}
                    placeholder="0.00"
                    step="0.01"
                    min="1"
                    className="w-full rounded-2xl border-2 border-stone-200 bg-white py-3.5 pl-11 pr-4 text-2xl font-black text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                    autoFocus
                  />
                </div>
              </div>

              {/* Live Fee & Calculation Breakdown */}
              {calculation && calculation.amount > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-stone-700">
                    <span>
                      {transactionType === "cash_in" ? "GCash Amount" : "Requested Cash"}
                    </span>
                    <span className="font-semibold text-stone-900">
                      {formatPeso(calculation.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-700">
                    <span>
                      Service Fee (
                      {calculation.amount < 1000 ? "3% tier" : "2% tier"})
                    </span>
                    <span className="font-semibold text-amber-800">
                      +{formatPeso(calculation.serviceFee)}
                    </span>
                  </div>
                  <div className="my-1.5 h-px bg-amber-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-950">
                      {transactionType === "cash_in"
                        ? "Physical Cash to Pay"
                        : "GCash to Send to Owner"}
                    </span>
                    <span className="text-xl font-black text-amber-800">
                      {formatPeso(calculation.finalAmount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-stone-50 border border-dashed border-stone-200 p-3.5 text-center text-xs text-stone-500">
                  ⚡ Rates: <strong>3%</strong> under ₱1,000 • <strong>2%</strong> for ₱1,000 and above
                </div>
              )}

              {/* Next Step CTA */}
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!calculation || calculation.amount <= 0}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-800 py-3.5 text-sm font-bold text-white shadow-md hover:bg-amber-900 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Continue to GCash Details
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ================= STEP 2: GCASH DETAILS ================= */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Customer Name */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                />
              </div>

              {/* --- CASH IN STEP 2: CUSTOMER DESTINATION --- */}
              {transactionType === "cash_in" && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                    Where should we send your GCash?
                  </label>

                  {/* Mode selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCashInMode("number");
                        setError("");
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                        cashInMode === "number"
                          ? "border-amber-700 bg-amber-50 text-amber-900 shadow-sm"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      GCash Number
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCashInMode("qr");
                        setError("");
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                        cashInMode === "qr"
                          ? "border-amber-700 bg-amber-50 text-amber-900 shadow-sm"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <QrCode className="h-4 w-4" />
                      Upload My QR
                    </button>
                  </div>

                  {cashInMode === "number" ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Your 11-digit GCash Number
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={customerNumber}
                        onChange={(e) => setCustomerNumber(e.target.value)}
                        placeholder="09XXXXXXXXX"
                        maxLength={11}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-base font-bold tracking-wider text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Your GCash Receiving QR
                      </label>
                      <input
                        type="file"
                        ref={qrInputRef}
                        accept="image/*"
                        onChange={handleCustomerQrChange}
                        className="hidden"
                      />
                      {customerQrPreview ? (
                        <div className="relative rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-3 text-center">
                          <img
                            src={customerQrPreview}
                            alt="Customer QR Preview"
                            className="mx-auto h-40 w-40 object-contain rounded-xl shadow-sm border border-amber-200 bg-white"
                          />
                          <div className="mt-2 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => qrInputRef.current?.click()}
                              className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900"
                            >
                              Change QR
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerQrFile(null);
                                setCustomerQrPreview("");
                              }}
                              className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-300"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => qrInputRef.current?.click()}
                          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 py-6 px-4 text-center hover:border-amber-600 hover:bg-amber-50/30 transition"
                        >
                          <Upload className="h-8 w-8 text-stone-400 mb-1" />
                          <span className="text-xs font-bold text-stone-800">
                            Tap to Upload Your GCash QR
                          </span>
                          <span className="text-[11px] text-stone-500 mt-0.5">
                            PNG, JPG or JPEG up to 5MB
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* --- CASH OUT STEP 2: OWNER RECIPIENT DISPLAY --- */}
              {transactionType === "cash_out" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
                      Send {formatPeso(calculation?.finalAmount ?? 0)} To:
                    </label>

                    {!isOwnerConfigured ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                        <p className="font-semibold mb-1">Notice</p>
                        <p>
                          GCash receiving details are temporarily unavailable online.
                          Please proceed to Room 411 / counter for assistance.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
                        {settings.gcash_account_name && (
                          <div>
                            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                              Account Name
                            </span>
                            <p className="font-bold text-stone-900 text-sm">
                              {settings.gcash_account_name}
                            </p>
                          </div>
                        )}

                        {settings.gcash_account_number && (
                          <div>
                            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                              GCash Number
                            </span>
                            <div className="mt-1 flex items-center justify-between rounded-xl bg-white border border-stone-200 px-3 py-2">
                              <span className="font-mono text-base font-bold text-stone-900 tracking-wider">
                                {settings.gcash_account_number}
                              </span>
                              <button
                                type="button"
                                onClick={handleCopyOwnerNumber}
                                className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200 active:scale-95 transition"
                              >
                                {copiedNumber ? (
                                  <>
                                    <Check className="h-3 w-3" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" /> Copy
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {settings.gcash_qr_url && (
                          <div className="pt-1 text-center">
                            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
                              Owner GCash QR
                            </span>
                            <img
                              src={settings.gcash_qr_url}
                              alt="Store GCash QR"
                              className="mx-auto h-36 w-36 rounded-xl border border-stone-200 bg-white p-1 shadow-sm object-contain"
                            />
                            <button
                              type="button"
                              onClick={handleDownloadOwnerQr}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                            >
                              <Download className="h-3.5 w-3.5" /> Download QR
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* GCash Reference & Optional Proof */}
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">
                      GCash Reference Number
                    </label>
                    <input
                      type="text"
                      value={cashOutRef}
                      onChange={(e) => setCashOutRef(e.target.value)}
                      placeholder="e.g. 1029 3847 5612"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm font-mono font-bold text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">
                      Payment Screenshot (Optional)
                    </label>
                    <input
                      type="file"
                      ref={proofInputRef}
                      accept="image/*"
                      onChange={handleProofChange}
                      className="hidden"
                    />
                    {paymentProofPreview ? (
                      <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-2">
                        <img
                          src={paymentProofPreview}
                          alt="Proof"
                          className="h-12 w-12 rounded-lg object-cover border border-stone-200"
                        />
                        <span className="text-xs font-medium text-stone-700 flex-1 truncate">
                          {paymentProofFile?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProofFile(null);
                            setPaymentProofPreview("");
                          }}
                          className="p-1 text-stone-400 hover:text-stone-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => proofInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
                      >
                        <Upload className="h-4 w-4 text-stone-500" />
                        Upload Receipt Screenshot
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Back / Next Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-800 py-3 text-xs font-bold text-white shadow-md hover:bg-amber-900 active:scale-[0.99] transition"
                >
                  Review & Confirm <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: CONFIRM ================= */}
          {step === 3 && calculation && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Transaction
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      transactionType === "cash_in"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {transactionType === "cash_in" ? "Cash In" : "Cash Out"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600">Customer Name</span>
                  <span className="font-bold text-stone-900">{studentName}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600">
                    {transactionType === "cash_in" ? "GCash Amount" : "Requested Cash"}
                  </span>
                  <span className="font-bold text-stone-900">{formatPeso(calculation.amount)}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600">Service Fee</span>
                  <span className="font-bold text-amber-800">+{formatPeso(calculation.serviceFee)}</span>
                </div>

                <div className="my-1.5 h-px bg-stone-200" />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 uppercase">
                    {transactionType === "cash_in" ? "Physical Cash to Pay" : "GCash You Send"}
                  </span>
                  <span className="text-xl font-black text-amber-800">
                    {formatPeso(calculation.finalAmount)}
                  </span>
                </div>

                {transactionType === "cash_in" ? (
                  <div className="pt-2 text-xs border-t border-stone-200">
                    <span className="text-stone-500 block mb-0.5">Owner Will Send To:</span>
                    <span className="font-bold text-stone-900">
                      {cashInMode === "number" ? customerNumber : "Uploaded QR Code"}
                    </span>
                  </div>
                ) : (
                  <div className="pt-2 text-xs border-t border-stone-200">
                    <span className="text-stone-500 block mb-0.5">GCash Reference:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {cashOutRef || "Uploaded Proof Screenshot"}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-800 py-3.5 text-xs font-bold text-white shadow-md hover:bg-amber-900 active:scale-[0.99] disabled:opacity-50 transition"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      {transactionType === "cash_in" ? "SUBMIT CASH IN" : "SUBMIT CASH OUT"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
