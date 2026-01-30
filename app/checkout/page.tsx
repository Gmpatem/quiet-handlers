"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, ShoppingBag, CreditCard, MapPin } from "lucide-react";

type CartItem = {
  id: string;
  name: string;
  category?: string | null;
  price_cents: number;
  qty: number;
  photo_url?: string | null;
};

type ProductForSnapshot = {
  id: string;
  name: string;
  category: string | null;
  cost_cents: number;
};

const CART_KEY = "fds_cart_v1";

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

function Field({ label, children }: any) {
  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold text-stone-900">{label}</div>
      {children}
    </div>
  );
}

function pickPendingLabel(labels: string[]) {
  const lower = labels.map((x) => x.toLowerCase());
  const i = lower.findIndex((s) => s.includes("pending"));
  if (i >= 0) return labels[i];

  const j = lower.findIndex((s) => s.includes("unpaid") || s.includes("await"));
  if (j >= 0) return labels[j];

  return labels[0] ?? "pending";
}

export default function CheckoutPage() {
  const [isPending, startTransition] = useTransition();

  
  const placingRef = useRef(false);
  const [isPlacing, setIsPlacing] = useState(false);
const [cart, setCart] = useState<CartItem[]>([]);
  const cartCount = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);
  const subtotalCents = useMemo(() => cart.reduce((a, i) => a + i.qty * i.price_cents, 0), [cart]);

  const [deliveryFeeCents, setDeliveryFeeCents] = useState<number>(1500);
  const [enableGCash, setEnableGCash] = useState(true);
  const [enableCOD, setEnableCOD] = useState(true);
  const [enableDelivery, setEnableDelivery] = useState(true);
  const [enablePickup, setEnablePickup] = useState(true);

  const [gcashName, setGcashName] = useState<string>("");
  const [gcashNumber, setGcashNumber] = useState<string>("");
  const [gcashInstructions, setGcashInstructions] = useState<string>("");

  const [paymentStatusLabels, setPaymentStatusLabels] = useState<string[]>([]);
  const [paymentStatusDefault, setPaymentStatusDefault] = useState<string>("");

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

  const feeCents = 0;
  const totalCents = subtotalCents + feeCents;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();

      const keys = [
        "delivery_fee_cents",
        "enable_gcash",
        "enable_cod",
        "enable_delivery",
        "enable_pickup",
        "gcash_enabled",
        "gcash_name",
        "gcash_number",
        "gcash_instructions",
      ];

      const { data, error } = await supabase.from("app_settings").select("key, value").in("key", keys);
      if (!error) {
        const map: Record<string, any> = {};
        for (const row of data ?? []) map[row.key] = row.value;

        if (typeof map.delivery_fee_cents === "number") setDeliveryFeeCents(map.delivery_fee_cents);
        if (typeof map.enable_gcash === "boolean") setEnableGCash(map.enable_gcash);
        if (typeof map.enable_cod === "boolean") setEnableCOD(map.enable_cod);
        if (typeof map.enable_delivery === "boolean") setEnableDelivery(map.enable_delivery);
        if (typeof map.enable_pickup === "boolean") setEnablePickup(map.enable_pickup);

        if (typeof map.gcash_enabled === "boolean") setEnableGCash(map.gcash_enabled);
        if (typeof map.gcash_name === "string") setGcashName(map.gcash_name);
        if (typeof map.gcash_number === "string") setGcashNumber(map.gcash_number);
        if (typeof map.gcash_instructions === "string") setGcashInstructions(map.gcash_instructions);
      }

      const { data: enumArr, error: enumErr } = await supabase.rpc("get_payment_status_enum");
      if (!enumErr && Array.isArray(enumArr) && enumArr.length > 0) {
        const labels = enumArr.map(String);
        setPaymentStatusLabels(labels);
        setPaymentStatusDefault(pickPendingLabel(labels));
      } else {
        setPaymentStatusDefault("pending");
      }
    })();
  }, []);

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

    
    if (placingRef.current) return; // ✅ ignore double-clicks
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
  p_payment_ref: paymentMethod === "gcash" ? gcashRef.trim() : "",
  p_items: items,
});

if (error) throw new Error(error.message);

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

  const stepLabels = ["Customer", "Fulfillment", "Location", "Payment", "Review"];
  const progressPct = ((step - 1) / 4) * 100;

  const fulfillmentText =
    pickupPoint === "boys" ? "Boys dorm (Room 411)" : pickupPoint === "girls" ? "Girls dorm (Room 206)" : "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50/30 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Button variant="outline" asChild className="gap-2 border-stone-300 text-stone-700">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to store
            </Link>
          </Button>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {cartCount ? `${cartCount} item(s)` : "Empty"}
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="space-y-4 bg-gradient-to-br from-stone-50 to-white p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-stone-600 to-amber-900 text-white shadow-md">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-stone-900">Checkout</h1>
                    <p className="text-sm text-stone-600">Fast campus order, no account needed</p>
                  </div>
                </div>
              </div>

              <div className="hidden text-right sm:block">
                <div className="text-xs text-stone-500">Step</div>
                <div className="text-sm font-semibold text-stone-900">{step} / 5</div>
              </div>
            </div>

            {/* Progress */}
            {!empty && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-500">
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
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            {empty ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-stone-400" />
                <h3 className="mt-4 font-semibold text-stone-900">Your cart is empty</h3>
                <p className="mt-2 text-sm text-stone-500">
                  <Link className="font-semibold text-amber-700 hover:text-amber-800" href="/">
                    Go back to the store
                  </Link>{" "}
                  to add items.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {errorMsg && (
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}

                {/* STEP 1: NAME */}
                {step === 1 && (
                  <div className="space-y-4">
                    <Field label="Your name">
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Juan D."
                        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                      />
                    </Field>
                  </div>
                )}

                {/* STEP 2: PICKUP LOCATION */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                      <MapPin className="h-4 w-4" />
                      Pickup location
                    </div>

                    <div className="grid gap-3">
                      <button
                        disabled={!enablePickup}
                        onClick={() => setPickupPoint("boys")}
                        className={[
                          "touch-target rounded-xl border-2 p-4 text-left shadow-sm transition-all",
                          pickupPoint === "boys"
                            ? "border-amber-700 bg-amber-50 ring-2 ring-amber-700/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
                          !enablePickup ? "cursor-not-allowed opacity-50" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold text-stone-900">Boys Dorm</div>
                        <div className="text-sm text-stone-600">Room 411</div>
                      </button>

                      <button
                        disabled={!enablePickup}
                        onClick={() => setPickupPoint("girls")}
                        className={[
                          "touch-target rounded-xl border-2 p-4 text-left shadow-sm transition-all",
                          pickupPoint === "girls"
                            ? "border-amber-700 bg-amber-50 ring-2 ring-amber-700/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
                          !enablePickup ? "cursor-not-allowed opacity-50" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold text-stone-900">Girls Dorm</div>
                        <div className="text-sm text-stone-600">Room 206</div>
                      </button>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 opacity-75">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-stone-900">Delivery</div>
                          <div className="text-sm text-stone-600">Campus delivery to your location</div>
                        </div>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          Coming soon
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: NOT USED */}
                {step === 3 && (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                    Delivery location is currently disabled.
                  </div>
                )}

                {/* STEP 4: PAYMENT */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                      <CreditCard className="h-4 w-4" />
                      Payment method
                    </div>

                    <div className="grid gap-3">
                      <button
                        disabled={!enableGCash}
                        onClick={() => setPaymentMethod("gcash")}
                        className={[
                          "touch-target rounded-xl border-2 p-4 text-left shadow-sm transition-all",
                          paymentMethod === "gcash"
                            ? "border-amber-700 bg-amber-50 ring-2 ring-amber-700/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
                          !enableGCash ? "cursor-not-allowed opacity-50" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold text-stone-900">GCash</div>
                        <div className="text-sm text-stone-600">Pay via GCash (enter ref)</div>
                      </button>

                      <button
                        disabled={!enableCOD}
                        onClick={() => setPaymentMethod("cod")}
                        className={[
                          "touch-target rounded-xl border-2 p-4 text-left shadow-sm transition-all",
                          paymentMethod === "cod"
                            ? "border-amber-700 bg-amber-50 ring-2 ring-amber-700/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
                          !enableCOD ? "cursor-not-allowed opacity-50" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold text-stone-900">Cash on Pickup</div>
                        <div className="text-sm text-stone-600">Pay when you receive it</div>
                      </button>
                    </div>

                    {paymentMethod === "gcash" && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="text-sm font-semibold text-amber-900">GCash payment details</div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="text-amber-700">Name</span>
                            <span className="font-semibold text-amber-900">{gcashName || "—"}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-amber-700">Number</span>
                            <span className="font-semibold text-amber-900">{gcashNumber || "—"}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-amber-700">Amount</span>
                            <span className="font-semibold text-amber-900">{peso(totalCents)}</span>
                          </div>
                        </div>

                        {gcashInstructions ? (
                          <p className="mt-3 text-xs text-amber-700">{gcashInstructions}</p>
                        ) : (
                          <p className="mt-3 text-xs text-amber-700">
                            Send exact amount, then enter your reference number.
                          </p>
                        )}

                        <div className="mt-4">
                          <label className="text-xs font-semibold text-amber-900">GCash reference number</label>
                          <input
                            value={gcashRef}
                            onChange={(e) => setGcashRef(e.target.value)}
                            placeholder="Enter reference number"
                            className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                          />
                          <div className="mt-1 text-xs text-amber-700">
                            If you'll pay after placing the order, enter{" "}
                            <span className="font-semibold">TO-FOLLOW</span>.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5: REVIEW */}
                {step === 5 && (
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-stone-900">Review your order</div>

                    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="text-sm font-semibold text-stone-900">{customerName}</div>
                      <div className="mt-1 text-sm text-stone-600">
                        Pickup • <span className="font-semibold">{fulfillmentText}</span>
                      </div>
                      <div className="mt-2 text-sm text-stone-600">
                        Payment: <span className="font-semibold">{paymentMethod.toUpperCase()}</span>
                        {paymentMethod === "gcash" && gcashRef ? ` • Ref: ${gcashRef}` : ""}
                      </div>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="text-sm font-semibold text-stone-900">Items</div>
                      <div className="mt-3 space-y-2">
                        {cart.map((i) => (
                          <div key={i.id} className="flex justify-between text-sm">
                            <div className="text-stone-700">
                              {i.qty}× {i.name}
                            </div>
                            <div className="font-semibold tabular-nums text-stone-900">
                              {peso(i.qty * i.price_cents)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Separator className="my-3" />

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-stone-600">Subtotal</span>
                          <span className="font-semibold tabular-nums text-stone-900">{peso(subtotalCents)}</span>
                        </div>

                        <div className="flex justify-between text-base">
                          <span className="font-semibold text-stone-900">Total</span>
                          <span className="font-bold tabular-nums text-stone-900">{peso(totalCents)}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      disabled={isPending || isPlacing}
                      onClick={placeOrder}
                      className="w-full touch-target bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950"
                      size="lg"
                    >
                      {isPending || isPlacing ? (
                        "Placing order…"
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Place order
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-stone-500">
                      After placing, you'll be redirected to your order success page.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {!empty && (
            <>
              <CardFooter className="flex gap-3 p-6 sm:p-8">
                {step !== 1 && (
                  <Button onClick={back} variant="outline" className="flex-1 touch-target border-stone-300">
                    Back
                  </Button>
                )}
                {step !== 5 && (
                  <Button
                    onClick={next}
                    className="flex-1 touch-target bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:from-amber-800 hover:to-amber-950"
                  >
                    Continue
                  </Button>
                )}
              </CardFooter>

              <div className="border-t border-stone-200 bg-stone-50 p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Subtotal</span>
                  <span className="font-semibold tabular-nums text-stone-900">{peso(subtotalCents)}</span>
                </div>

                <div className="mt-2 flex justify-between text-base">
                  <span className="font-semibold text-stone-900">Total</span>
                  <span className="font-bold tabular-nums text-stone-900">{peso(totalCents)}</span>
                </div>
              </div>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-stone-500">
          Final Destination Services - Handling things. Quietly
        </p>
      </div>
    </div>
  );
}


