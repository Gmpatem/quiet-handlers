"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, ShoppingBag, CreditCard, MapPin, User, Package, Info, Home, Building, Shield, AlertCircle } from "lucide-react";

type CartItem = {
  id: string;
  name: string;
  category?: string | null;
  price_cents: number;
  qty: number;
  photo_url?: string | null;
};

const CART_KEY = "fds_cart_v1";
const CUSTOMER_MEMORY_KEY = "tenpesorun_customer_memory";
const PICKUP_MEMORY_KEY = "tenpesorun_pickup_point";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

function genOrderCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `FDS-${s}`;
}

function genUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Field({ label, children, icon: Icon }: any) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </div>
      {children}
    </div>
  );
}

// ✅ NEW: Props interface for server-side data
type CheckoutClientProps = {
  initialSettings: {
    deliveryFeeCents: number;
    enableGCash: boolean;
    enableCOD: boolean;
    enableDelivery: boolean;
    enablePickup: boolean;
    gcashName: string;
    gcashNumber: string;
    gcashInstructions: string;
  };
  paymentEnums: string[];
};

export default function CheckoutClient({ initialSettings, paymentEnums }: CheckoutClientProps) {
  const [isPending, startTransition] = useTransition();

  const placingRef = useRef(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartCount = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);
  const subtotalCents = useMemo(() => cart.reduce((a, i) => a + i.qty * i.price_cents, 0), [cart]);

  // ✅ OPTIMIZED: Use settings from props (no database fetch!)
  const deliveryFeeCents = initialSettings.deliveryFeeCents;
  const enableGCash = initialSettings.enableGCash;
  const enableCOD = initialSettings.enableCOD;
  const enableDelivery = initialSettings.enableDelivery;
  const enablePickup = initialSettings.enablePickup;
  const gcashName = initialSettings.gcashName;
  const gcashNumber = initialSettings.gcashNumber;
  const gcashInstructions = initialSettings.gcashInstructions;

  // ✅ OPTIMIZED: Payment status from props
  const paymentStatusDefault = useMemo(() => {
    const labels = paymentEnums;
    const lower = labels.map((x) => x.toLowerCase());
    const i = lower.findIndex((s) => s.includes("pending"));
    if (i >= 0) return labels[i];
    const j = lower.findIndex((s) => s.includes("unpaid") || s.includes("await"));
    if (j >= 0) return labels[j];
    return labels[0] ?? "pending";
  }, [paymentEnums]);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [customerName, setCustomerName] = useState("");
  const contact = "N/A";
  const fulfillment: "pickup" | "delivery" = "pickup";
  const [pickupPoint, setPickupPoint] = useState<"boys" | "girls" | "">("");

  const [locationType, setLocationType] = useState<"house" | "room" | "other" | "">("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "cod" | "">("");
  const [gcashRef, setGcashRef] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ NEW: Name autocomplete state
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  const feeCents = 0;
  const totalCents = subtotalCents + feeCents;

  // Load cart from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  // ✅ NEW: Load remembered customer name
  useEffect(() => {
    try {
      const memory = localStorage.getItem(CUSTOMER_MEMORY_KEY);
      if (memory) {
        const data = JSON.parse(memory);
        // Auto-fill if used recently (within 7 days)
        if (data.name && Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
          setCustomerName(data.name);
        }
        // Load previous names for autocomplete
        if (data.previousNames && Array.isArray(data.previousNames)) {
          setSavedNames(data.previousNames.slice(0, 3)); // Show last 3 names
        }
      }
    } catch {}
  }, []);

  // ✅ NEW: Save customer name as they type
  useEffect(() => {
    if (customerName.trim().length > 3) {
      try {
        const memory = JSON.parse(localStorage.getItem(CUSTOMER_MEMORY_KEY) || "{}");
        memory.name = customerName.trim();
        memory.timestamp = Date.now();
        localStorage.setItem(CUSTOMER_MEMORY_KEY, JSON.stringify(memory));
      } catch {}
    }
  }, [customerName]);

  // ✅ NEW: Load remembered pickup point
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PICKUP_MEMORY_KEY);
      if (saved && (saved === "boys" || saved === "girls")) {
        setPickupPoint(saved as any);
      }
    } catch {}
  }, []);

  // ✅ NEW: Save pickup point when selected
  useEffect(() => {
    if (pickupPoint) {
      try {
        localStorage.setItem(PICKUP_MEMORY_KEY, pickupPoint);
      } catch {}
    }
  }, [pickupPoint]);

  const empty = cart.length === 0;

  function next() {
    setErrorMsg(null);

    if (step === 1) {
      if (!customerName.trim()) return setErrorMsg("Please enter your name.");
      return setStep(2);
    }

    if (step === 2) {
      if (!pickupPoint) return setErrorMsg("Please choose a pickup point (Boys or Girls dorm).");
      return setStep(4);
    }

    if (step === 3) {
      return setStep(4);
    }

    if (step === 4) {
      if (!paymentMethod) return setErrorMsg("Please choose a payment method.");
      if (paymentMethod === "gcash" && !gcashRef.trim())
        return setErrorMsg("Please enter your GCash reference number (or TO-FOLLOW).");
      return setStep(5);
    }
  }

  function back() {
    setErrorMsg(null);
    if (step === 2) return setStep(1);
    if (step === 4) return setStep(2);
    if (step === 5) return setStep(4);
  }

  async function placeOrder() {
    setErrorMsg(null);

    if (placingRef.current) return;
    placingRef.current = true;
    setIsPlacing(true);
    
    if (empty) return setErrorMsg("Your cart is empty.");
    if (!paymentStatusDefault) return setErrorMsg("Loading settings… please try again.");
    if (!customerName.trim()) return setErrorMsg("Please enter your name.");
    if (!pickupPoint) return setErrorMsg("Please choose a pickup point (Boys or Girls dorm).");
    if (!paymentMethod) return setErrorMsg("Please choose a payment method.");
    if (paymentMethod === "gcash" && !gcashRef.trim()) {
      return setErrorMsg("Please enter your GCash reference number (or TO-FOLLOW).");
    }

    startTransition(async () => {
      try {
        const supabase = supabaseBrowser();

        const order_id = genUUID();
        const order_code = genOrderCode();

        const pickupLabel =
          pickupPoint === "boys"
            ? "Pickup: Boys dorm (Room 411)"
            : pickupPoint === "girls"
              ? "Pickup: Girls dorm (Room 206)"
              : "";

        const mergedNotes = [pickupLabel, notes.trim()].filter(Boolean).join(" | ") || "";

        const items = cart.map((c) => ({
          product_id: c.id,
          qty: c.qty,
        }));

        const { data, error } = await supabase.rpc("place_order_atomic", {
          p_order_id: order_id,
          p_order_code: order_code,
          p_customer_name: customerName.trim(),
          p_contact: contact,
          p_notes: mergedNotes,
          p_fulfillment: fulfillment,
          p_pickup_location:
            pickupPoint === "boys" ? "boys_411" : pickupPoint === "girls" ? "girls_206" : "",
          p_delivery_fee_cents: feeCents,
          p_delivery_location: "",
          p_payment_method: paymentMethod,
          p_payment_status: paymentStatusDefault,
          p_payment_ref: paymentMethod === "gcash" ? gcashRef.trim() : null,
          p_items: items,
        });

        if (error) throw new Error(error.message);

        // ✅ NEW: Save name to history for autocomplete
        try {
          const memory = JSON.parse(localStorage.getItem(CUSTOMER_MEMORY_KEY) || "{}");
          const names = memory.previousNames || [];
          if (!names.includes(customerName.trim())) {
            names.unshift(customerName.trim());
            memory.previousNames = names.slice(0, 5); // Keep last 5 names
          }
          memory.name = customerName.trim();
          memory.timestamp = Date.now();
          localStorage.setItem(CUSTOMER_MEMORY_KEY, JSON.stringify(memory));
        } catch {}

        try {
          localStorage.removeItem(CART_KEY);
        } catch {}

        window.location.href = `/order/success/${data?.order_code ?? order_code}`;
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to place order.");
        placingRef.current = false;
        setIsPlacing(false);
      }
    });
  }

  const stepLabels = ["Your Info", "Pickup Point", "Delivery", "Payment", "Review"];
  const progressPct = ((step - 1) / 4) * 100;

  const fulfillmentText =
    pickupPoint === "boys" ? "Boys dorm (Room 411)" : pickupPoint === "girls" ? "Girls dorm (Room 206)" : "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Enhanced Mobile Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center justify-between px-4 py-3">
          <Button 
            variant="ghost" 
            asChild 
            className="gap-2 text-stone-700 hover:bg-stone-100 active:scale-95"
            size="sm"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline">Back to store</span>
              <span className="xs:hidden">Back</span>
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <Badge variant="secondary" className="bg-stone-100 text-stone-700">
                {cartCount ? `${cartCount} item${cartCount !== 1 ? 's' : ''}` : "Empty"}
              </Badge>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-xs font-bold text-white">
              {step}
            </div>
          </div>
        </div>

        {/* Mobile Progress Bar */}
        {!empty && (
          <div className="px-4 pb-2">
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span className="font-medium text-stone-700">{stepLabels[step - 1]}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-900 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <div className="px-4 py-4 sm:px-6 sm:py-8 max-w-3xl mx-auto">
        {/* Main Card */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg sm:rounded-3xl">
          {/* Card Header */}
          <div className="bg-gradient-to-br from-stone-50 to-white p-5 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-md">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">Checkout</h1>
                <p className="text-sm text-stone-600 truncate">Fast campus order • No account needed</p>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs text-stone-500">Step</div>
                <div className="text-sm font-semibold text-stone-900">{step} of 5</div>
              </div>
            </div>

            {/* Desktop Progress Bar (hidden on mobile) */}
            {!empty && (
              <div className="hidden sm:block mt-6">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                  <span className="font-medium text-stone-700">{stepLabels[step - 1]}</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-900 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card Content */}
          <div className="p-5 sm:p-8">
            {empty ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                <ShoppingBag className="mx-auto h-14 w-14 text-stone-400" />
                <h3 className="mt-4 font-semibold text-stone-900">Your cart is empty</h3>
                <p className="mt-2 text-sm text-stone-600">
                  Add items to your cart before checking out
                </p>
                <Button asChild className="mt-4 w-full sm:w-auto">
                  <Link href="/" className="bg-gradient-to-r from-amber-700 to-amber-900 text-white">
                    Return to Store
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Error Message */}
                {errorMsg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">{errorMsg}</div>
                  </div>
                )}

                {/* STEP 1: CUSTOMER INFO */}
                {step === 1 && (
                  <div className="space-y-5">
                    <Field label="Your full name" icon={User}>
                      <div className="relative">
                        <input
                          value={customerName}
                          id="customer_name"
                          name="customer_name"
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            setShowNameSuggestions(e.target.value.length > 0 && savedNames.length > 0);
                          }}
                          onFocus={() => setShowNameSuggestions(savedNames.length > 0)}
                          onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                          placeholder="Enter your first and last name"
                          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                          autoComplete="name"
                          autoFocus
                        />
                        
                        {/* ✅ NEW: Autocomplete dropdown */}
                        {showNameSuggestions && savedNames.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-stone-200 bg-white shadow-lg z-10">
                            {savedNames
                              .filter(name => name.toLowerCase().includes(customerName.toLowerCase()))
                              .map((name, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setCustomerName(name);
                                    setShowNameSuggestions(false);
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors text-sm first:rounded-t-xl last:rounded-b-xl"
                                >
                                  <div className="font-medium text-stone-900">{name}</div>
                                  <div className="text-xs text-stone-500">Tap to use this name</div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </Field>

                    {/* ✅ NEW: Welcome back message */}
                    {customerName && customerName.trim().length > 3 && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-emerald-900">
                              Welcome back, {customerName.split(' ')[0]}!
                            </div>
                            <div className="mt-1 text-xs text-emerald-700">
                              We've saved your name for faster checkout next time.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-amber-700 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-amber-900">Important</div>
                          <div className="mt-1 text-xs text-amber-700">
                            Please use your real name for order verification at pickup.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: PICKUP LOCATION */}
                {step === 2 && (
                  <div className="space-y-5">
                    <Field label="Choose pickup location" icon={MapPin}>
                      <p className="text-sm text-stone-600 mb-3">
                        Select where you'll pick up your order
                      </p>
                    </Field>

                    <div className="grid gap-3">
                      <button
                        disabled={!enablePickup}
                        onClick={() => {
                          setPickupPoint("boys");
                          setErrorMsg(null);
                          // ✅ NEW: Auto-advance after selection
                          setTimeout(() => setStep(4), 300);
                        }}
                        className={`
                          w-full rounded-xl border-2 p-4 text-left shadow-sm transition-all duration-200
                          ${pickupPoint === "boys"
                            ? "border-amber-700 bg-gradient-to-br from-amber-50 to-amber-100 ring-2 ring-amber-700/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                          }
                          ${!enablePickup ? "cursor-not-allowed opacity-50" : "active:scale-[0.98]"}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-stone-900">Boys Dorm</div>
                            <div className="text-sm text-stone-600">Room 411</div>
                          </div>
                          {pickupPoint === "boys" && (
                            <CheckCircle2 className="h-5 w-5 text-amber-700" />
                          )}
                        </div>
                      </button>

                      <button
                        disabled={!enablePickup}
                        onClick={() => {
                          setPickupPoint("girls");
                          setErrorMsg(null);
                          // ✅ NEW: Auto-advance after selection
                          setTimeout(() => setStep(4), 300);
                        }}
                        className={`
                          w-full rounded-xl border-2 p-4 text-left shadow-sm transition-all duration-200
                          ${pickupPoint === "girls"
                            ? "border-amber-700 bg-gradient-to-br from-amber-50 to-amber-100 ring-2 ring-amber-700/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                          }
                          ${!enablePickup ? "cursor-not-allowed opacity-50" : "active:scale-[0.98]"}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-stone-900">Girls Dorm</div>
                            <div className="text-sm text-stone-600">Room 206</div>
                          </div>
                          {pickupPoint === "girls" && (
                            <CheckCircle2 className="h-5 w-5 text-amber-700" />
                          )}
                        </div>
                      </button>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex items-start gap-3">
                        <Building className="h-5 w-5 text-stone-600 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-stone-900">Delivery Service</div>
                          <div className="text-sm text-stone-600">
                            Campus-wide delivery coming soon. Stay tuned!
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: PAYMENT METHOD */}
                {step === 4 && (
                  <div className="space-y-5">
                    <Field label="Select payment method" icon={CreditCard}>
                      <p className="text-sm text-stone-600 mb-3">
                        Choose how you'd like to pay
                      </p>
                    </Field>

                    <div className="grid gap-3">
                      {/* GCash Option */}
                      <button
                        disabled={!enableGCash}
                        onClick={() => setPaymentMethod("gcash")}
                        className={`
                          w-full rounded-xl border-2 p-4 text-left shadow-sm transition-all duration-200
                          ${paymentMethod === "gcash"
                            ? "border-amber-700 bg-gradient-to-br from-amber-50 to-amber-100 ring-2 ring-amber-700/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                          }
                          ${!enableGCash ? "cursor-not-allowed opacity-50" : "active:scale-[0.98]"}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
                              <span className="text-lg font-bold text-white">GC</span>
                            </div>
                            <div>
                              <div className="font-semibold text-stone-900">GCash</div>
                              <div className="text-sm text-stone-600">Pay via mobile wallet</div>
                            </div>
                          </div>
                          {paymentMethod === "gcash" && (
                            <CheckCircle2 className="h-5 w-5 text-amber-700" />
                          )}
                        </div>
                      </button>

                      {/* Cash on Pickup Option */}
                      <button
                        disabled={!enableCOD}
                        onClick={() => setPaymentMethod("cod")}
                        className={`
                          w-full rounded-xl border-2 p-4 text-left shadow-sm transition-all duration-200
                          ${paymentMethod === "cod"
                            ? "border-amber-700 bg-gradient-to-br from-amber-50 to-amber-100 ring-2 ring-amber-700/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                          }
                          ${!enableCOD ? "cursor-not-allowed opacity-50" : "active:scale-[0.98]"}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-800">
                              <span className="text-lg font-bold text-white">₱</span>
                            </div>
                            <div>
                              <div className="font-semibold text-stone-900">Cash on Pickup</div>
                              <div className="text-sm text-stone-600">Pay when you receive</div>
                            </div>
                          </div>
                          {paymentMethod === "cod" && (
                            <CheckCircle2 className="h-5 w-5 text-amber-700" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* GCash Details */}
                    {paymentMethod === "gcash" && (
                      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-amber-700" />
                          <div className="text-sm font-semibold text-amber-900">GCash Payment Details</div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-white p-3">
                              <div className="text-xs text-amber-700">Account Name</div>
                              <div className="font-semibold text-amber-900">{gcashName || "—"}</div>
                            </div>
                            <div className="rounded-lg bg-white p-3">
                              <div className="text-xs text-amber-700">Mobile Number</div>
                              <div className="font-semibold text-amber-900">{gcashNumber || "—"}</div>
                            </div>
                          </div>

                          <div className="rounded-lg bg-white p-3">
                            <div className="text-xs text-amber-700">Amount to Send</div>
                            <div className="font-semibold text-lg text-amber-900">{peso(totalCents)}</div>
                          </div>

                          {gcashInstructions && (
                            <div className="rounded-lg border border-amber-300 bg-white p-3">
                              <div className="text-xs text-amber-700">{gcashInstructions}</div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label htmlFor="gcash_ref" className="text-xs font-semibold text-amber-900">
                              GCash Reference Number
                            </label>
                            <input
                              value={gcashRef}
                              id="gcash_ref"
                              name="gcash_ref"
                              onChange={(e) => setGcashRef(e.target.value)}
                              placeholder="Enter 10-12 digit reference"
                              className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                              autoComplete="off"
                              autoFocus
                            />
                            <div className="text-xs text-amber-700">
                              If paying later, enter <span className="font-semibold">TO-FOLLOW</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5: ORDER REVIEW */}
                {step === 5 && (
                  <div className="space-y-5">
                    <Field label="Review your order" icon={Package}>
                      <p className="text-sm text-stone-600">
                        Please verify all details before placing your order
                      </p>
                    </Field>

                    {/* Order Summary Card */}
                    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                      <div className="space-y-4">
                        {/* Customer Info */}
                        <div>
                          <div className="text-sm font-semibold text-stone-900">Customer Details</div>
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-stone-600">Name</span>
                              <span className="font-semibold text-stone-900">{customerName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-600">Pickup Point</span>
                              <span className="font-semibold text-stone-900">{fulfillmentText}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-600">Payment Method</span>
                              <span className="font-semibold text-stone-900">
                                {paymentMethod.toUpperCase()}
                                {paymentMethod === "gcash" && gcashRef && ` • ${gcashRef}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Order Items */}
                        <div>
                          <div className="text-sm font-semibold text-stone-900 mb-2">Order Items</div>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {cart.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <div className="text-stone-700">
                                  <span className="font-semibold">{item.qty}×</span> {item.name}
                                </div>
                                <div className="font-semibold tabular-nums text-stone-900">
                                  {peso(item.qty * item.price_cents)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        {/* Order Total */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-stone-600">Subtotal</span>
                            <span className="font-semibold tabular-nums text-stone-900">{peso(subtotalCents)}</span>
                          </div>
                          <div className="flex justify-between text-base">
                            <span className="font-semibold text-stone-900">Total Amount</span>
                            <span className="font-bold tabular-nums text-stone-900">{peso(totalCents)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <Button
                      disabled={isPending || isPlacing}
                      onClick={placeOrder}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 text-base font-semibold text-white shadow-lg hover:from-amber-800 hover:to-amber-950 active:scale-[0.98] transition-all duration-200"
                    >
                      {isPending || isPlacing ? (
                        <>
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span className="ml-2">Placing Order...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Place Order Now
                        </>
                      )}
                    </Button>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                      <div className="text-xs text-amber-700">
                        After placing your order, you'll be redirected to your order confirmation page.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {!empty && (
            <>
              <div className="border-t border-stone-200 p-5 sm:p-8">
                <div className="flex gap-3">
                  {step !== 1 && (
                    <Button
                      onClick={back}
                      variant="outline"
                      className="flex-1 h-12 rounded-xl border-stone-300 text-stone-700 hover:bg-stone-50 active:scale-95"
                    >
                      Back
                    </Button>
                  )}
                  {step !== 5 && (
                    <Button
                      onClick={next}
                      className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950 active:scale-95"
                    >
                      Continue
                    </Button>
                  )}
                </div>
              </div>

              {/* Order Summary Sticky Bar for Mobile */}
              <div className="sticky bottom-0 border-t border-stone-200 bg-white p-4 shadow-2xl sm:hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-stone-600">Order Total</div>
                    <div className="text-lg font-bold text-stone-900">{peso(totalCents)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-stone-600">{cartCount} item{cartCount !== 1 ? 's' : ''}</div>
                    <div className="text-sm font-semibold text-stone-900">{step} of 5</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Final Destination Services</span> • Handling things. Quietly
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-stone-500">
            <span>Secure checkout</span>
            <span>•</span>
            <span>No account required</span>
            <span>•</span>
            <span>Campus delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
}
