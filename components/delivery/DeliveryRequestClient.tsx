"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  Truck,
  ShoppingBag,
  Phone,
  User,
  Banknote,
  Camera,
  CheckCircle,
  AlertCircle,
  X,
  ChevronRight,
  CreditCard,
} from "lucide-react";

const DELIVERY_FEE = 50;

export default function DeliveryRequestClient() {
  const [formData, setFormData] = useState({
    student_name: "",
    student_contact: "",
    item_description: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "cod">("cod");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = supabaseBrowser();

  // Handle image capture/upload
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setPaymentProof(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload to Supabase
  const uploadPaymentProof = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("delivery-proofs")
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("delivery-proofs")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.student_name.trim()) throw new Error("Enter your name");
      if (!formData.student_contact.trim()) throw new Error("Enter your contact");
      if (!formData.item_description.trim()) throw new Error("What do you want to buy?");
      if (paymentMethod === "prepaid" && !paymentProof) throw new Error("Upload payment proof");

      let paymentProofUrl = null;
      if (paymentMethod === "prepaid" && paymentProof) {
        paymentProofUrl = await uploadPaymentProof(paymentProof);
      }

      const { error: insertError } = await supabase
        .from("delivery_requests")
        .insert({
          student_name: formData.student_name.trim(),
          student_contact: formData.student_contact.trim(),
          item_description: formData.item_description.trim(),
          store_location: null,
          payment_method: paymentMethod,
          delivery_fee: DELIVERY_FEE,
          payment_proof_url: paymentProofUrl,
          payment_status: paymentMethod === "prepaid" ? "paid" : "unpaid",
        });

      if (insertError) throw insertError;

      setSuccess(true);
      
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border-2 border-emerald-200 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
              <CheckCircle className="h-14 w-14 text-white" />
            </div>
            
            <h2 className="mb-3 text-3xl font-bold text-stone-900">
              Request Sent! 🎉
            </h2>
            
            <p className="mb-8 text-lg text-stone-600">
              We'll contact you at<br/>
              <span className="font-bold text-amber-700">{formData.student_contact}</span>
            </p>

            {paymentMethod === "cod" && (
              <div className="mb-8 rounded-2xl bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-900">💵 Cash on Delivery</div>
                <div className="text-xs text-amber-700">Pay when you receive the item</div>
              </div>
            )}

            {paymentMethod === "prepaid" && (
              <div className="mb-8 rounded-2xl bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-900">✅ Payment Received</div>
                <div className="text-xs text-emerald-700">We'll process your order soon</div>
              </div>
            )}

            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  student_name: "",
                  student_contact: "",
                  item_description: "",
                });
                setPaymentMethod("cod");
                setPaymentProof(null);
                setPaymentProofPreview(null);
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-4 text-lg font-bold text-white shadow-lg active:scale-95"
            >
              Order Something Else
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-28">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-amber-700 to-amber-900 px-4 py-6 shadow-xl">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Truck className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Off-Campus Delivery</h1>
              <p className="text-sm text-white/90">We buy & deliver for you</p>
            </div>
          </div>
          
          {/* Delivery Fee Badge */}
          <div className="flex items-center justify-between rounded-2xl bg-white/20 px-4 py-3 backdrop-blur-md">
            <span className="font-semibold text-white">Delivery Fee</span>
            <span className="text-2xl font-bold text-white">₱{DELIVERY_FEE}</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="sticky top-24 z-10 mx-4 mt-4">
          <div className="mx-auto max-w-2xl rounded-2xl border-2 border-red-200 bg-red-50 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="rounded-lg p-1 hover:bg-red-100"
              >
                <X className="h-5 w-5 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-6">
        {/* Personal Info */}
        <div className="mb-6 space-y-4">
          <h3 className="text-xl font-bold text-stone-900">Your Info</h3>
          
          {/* Name */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-base font-semibold text-stone-700">
              <User className="h-5 w-5 text-amber-700" />
              Name
            </label>
            <input
              type="text"
              value={formData.student_name}
              onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
              placeholder="Juan Dela Cruz"
              className="w-full rounded-2xl border-2 border-stone-200 px-5 py-4 text-lg text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-100"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Contact */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-base font-semibold text-stone-700">
              <Phone className="h-5 w-5 text-amber-700" />
              Contact Number
            </label>
            <input
              type="tel"
              value={formData.student_contact}
              onChange={(e) => setFormData({ ...formData, student_contact: e.target.value })}
              placeholder="09XX XXX XXXX"
              className="w-full rounded-2xl border-2 border-stone-200 px-5 py-4 text-lg text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-100"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Order Details */}
        <div className="mb-6 space-y-4">
          <h3 className="text-xl font-bold text-stone-900">What to Buy</h3>
          
          {/* Item Description */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-base font-semibold text-stone-700">
              <ShoppingBag className="h-5 w-5 text-amber-700" />
              Item Details
            </label>
            <textarea
              value={formData.item_description}
              onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
              placeholder="Example: 2pc Chickenjoy with rice from Jollibee SM"
              rows={4}
              className="w-full rounded-2xl border-2 border-stone-200 px-5 py-4 text-lg text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-100"
              style={{ fontSize: '16px' }}
            />
            <p className="mt-2 text-sm text-stone-500">
              Include: What item + Where to buy (optional)
            </p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6 space-y-4">
          <h3 className="text-xl font-bold text-stone-900">Payment</h3>
          
          <div className="grid gap-3">
            {/* COD */}
            <button
              type="button"
              onClick={() => setPaymentMethod("cod")}
              className={`rounded-2xl border-3 p-5 text-left transition active:scale-95 ${
                paymentMethod === "cod"
                  ? "border-amber-700 bg-amber-50 shadow-lg"
                  : "border-stone-200 bg-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Banknote className={`h-6 w-6 ${paymentMethod === "cod" ? "text-amber-700" : "text-stone-400"}`} />
                  <div className="text-lg font-bold text-stone-900">Cash on Delivery</div>
                </div>
                <div className={`h-6 w-6 rounded-full border-3 ${
                  paymentMethod === "cod"
                    ? "border-amber-700 bg-amber-700"
                    : "border-stone-300"
                }`}>
                  {paymentMethod === "cod" && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-stone-600">Pay when item arrives</div>
            </button>

            {/* Prepaid */}
            <button
              type="button"
              onClick={() => setPaymentMethod("prepaid")}
              className={`rounded-2xl border-3 p-5 text-left transition active:scale-95 ${
                paymentMethod === "prepaid"
                  ? "border-amber-700 bg-amber-50 shadow-lg"
                  : "border-stone-200 bg-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className={`h-6 w-6 ${paymentMethod === "prepaid" ? "text-amber-700" : "text-stone-400"}`} />
                  <div className="text-lg font-bold text-stone-900">Prepaid (GCash)</div>
                </div>
                <div className={`h-6 w-6 rounded-full border-3 ${
                  paymentMethod === "prepaid"
                    ? "border-amber-700 bg-amber-700"
                    : "border-stone-300"
                }`}>
                  {paymentMethod === "prepaid" && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-stone-600">Pay now via GCash</div>
            </button>
          </div>

          {/* GCash Instructions */}
          {paymentMethod === "prepaid" && (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
              <div className="mb-4 text-lg font-bold text-amber-900">Send GCash To:</div>
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                  <span className="text-sm text-stone-600">Number</span>
                  <span className="text-lg font-bold text-stone-900">639994462191</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                  <span className="text-sm text-stone-600">Name</span>
                  <span className="text-lg font-bold text-stone-900">N.M</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                  <span className="text-sm text-stone-600">Amount</span>
                  <span className="text-lg font-bold text-amber-700">₱{DELIVERY_FEE}</span>
                </div>
              </div>

              {/* Upload Photo */}
              <div className="mb-2 text-sm font-semibold text-amber-900">Upload Screenshot:</div>
              
              {paymentProofPreview ? (
                <div className="relative">
                  <img
                    src={paymentProofPreview}
                    alt="Payment proof"
                    className="w-full rounded-2xl border-2 border-amber-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentProof(null);
                      setPaymentProofPreview(null);
                    }}
                    className="absolute right-3 top-3 rounded-full bg-red-500 p-3 text-white shadow-lg active:scale-95"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center rounded-2xl border-3 border-dashed border-amber-300 bg-white p-8 active:scale-95">
                  <Camera className="h-12 w-12 text-amber-600" />
                  <span className="mt-3 text-lg font-bold text-amber-900">
                    Tap to Upload Photo
                  </span>
                  <span className="mt-1 text-sm text-amber-700">
                    Screenshot of GCash payment
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Submit Button - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t-2 border-stone-200 bg-white/95 p-4 backdrop-blur-md">
        <div className="mx-auto max-w-2xl">
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-5 text-xl font-bold text-white shadow-2xl disabled:opacity-50 active:scale-95"
          >
            {loading ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-white border-t-transparent" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Submit Request</span>
                <ChevronRight className="h-6 w-6" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}