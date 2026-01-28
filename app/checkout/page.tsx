"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

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

const CART_KEY = "tenpesorun_cart_v1";

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

function genOrderCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `TPR-${s}`;
}

function genUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Field({ label, children }: any) {
  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
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

  // ✅ Step 1 only: name
  const [customerName, setCustomerName] = useState("");

  // ✅ Contact still exists because DB requires it (not nullable). We auto-fill.
  const contact = "N/A";

  // ✅ Fulfillment locked to pickup (Delivery disabled)
  const fulfillment: "pickup" | "delivery" = "pickup";

  // ✅ Pickup point is selectable (same as before)
  const [pickupPoint, setPickupPoint] = useState<"boys" | "girls" | "">("");

  // Delivery fields remain but are never used (step 3 never reached)
  const [locationType, setLocationType] = useState<"house" | "room" | "other" | "">("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "cod" | "">("");
  const [gcashRef, setGcashRef] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ Delivery locked OFF, so fee is always 0 and total is stable
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
      return setStep(4); // skip delivery
    }

    // Step 3 will never be reached, but keep logic harmless
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

        const ids = cart.map((c) => c.id);
        const { data: prods, error: pErr } = await supabase
          .from("products")
          .select("id, name, category, cost_cents")
          .in("id", ids);

        if (pErr) throw new Error(pErr.message);

        const byId = new Map<string, ProductForSnapshot>();
        for (const p of (prods ?? []) as any[]) {
          byId.set(p.id, { id: p.id, name: p.name, category: p.category ?? null, cost_cents: p.cost_cents ?? 0 });
        }

        const order_id = genUUID();
        const order_code = genOrderCode();

        // ✅ Still records pickup label inside notes like before
        const pickupLabel =
          pickupPoint === "boys"
            ? "Pickup: Boys dorm (Room 411)"
            : pickupPoint === "girls"
              ? "Pickup: Girls dorm (Room 206)"
              : "";

        const mergedNotes = [pickupLabel, notes.trim()].filter(Boolean).join(" | ") || null;

        const { error: oErr } = await supabase.from("orders").insert({
          id: order_id,
          order_code,
          customer_name: customerName.trim(),
          contact, // ✅ required by schema
          notes: mergedNotes,
          fulfillment: fulfillment,
          pickup_location: pickupPoint === "boys" ? "boys_411" : pickupPoint === "girls" ? "girls_206" : null,
          delivery_fee_cents: 0,
          delivery_location: null,
          payment_method: paymentMethod,
          subtotal_cents: subtotalCents,
          total_cents: totalCents,
          status: "pending",
        });

        if (oErr) throw new Error(oErr.message);

        const itemsPayload = cart.map((c) => {
          const snap = byId.get(c.id);
          return {
            order_id,
            product_id: c.id,
            name_snapshot: c.name,
            category_snapshot: snap?.category ?? c.category ?? null,
            unit_price_cents: c.price_cents,
            unit_cost_cents: snap?.cost_cents ?? 0,
            qty: c.qty,
            line_total_cents: c.qty * c.price_cents,
          };
        });

        const { error: oiErr } = await supabase.from("order_items").insert(itemsPayload);
        if (oiErr) throw new Error(oiErr.message);

        const paymentPayload: any = {
          order_id,
          method: paymentMethod,
          amount_cents: totalCents,
          reference_number: paymentMethod === "gcash" ? gcashRef.trim() : null,
          status: paymentStatusDefault,
        };

        const { error: payErr } = await supabase.from("payments").insert(paymentPayload);
        if (payErr) throw new Error(payErr.message);

        try {
          localStorage.removeItem(CART_KEY);
        } catch {}

        window.location.href = `/order/success/${order_code}`;
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to place order.");
      }
    });
  }

  // UI helpers
  const stepLabels = ["Customer", "Fulfillment", "Location", "Payment", "Review"];
  const progressPct = ((step - 1) / 4) * 100;

  const fulfillmentText =
    pickupPoint === "boys" ? "Boys dorm (Room 411)" : pickupPoint === "girls" ? "Girls dorm (Room 206)" : "—";

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-slate-900 hover:border-slate-200 hover:bg-white hover:shadow-sm transition"
          >
            ← Back to store
          </Link>
          <div className="hidden sm:block rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            {cartCount ? `${cartCount} item(s)` : "Empty"}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-9">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-slate-900">Checkout</div>
                <div className="mt-1 text-sm text-slate-600">Fast campus order, no account needed.</div>
              </div>

              <div className="hidden sm:block text-right">
                <div className="text-xs text-slate-500">Step</div>
                <div className="text-sm font-semibold text-slate-900">
                  {step} / 5
                </div>
              </div>
            </div>

            {/* Progress */}
            {!empty && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{stepLabels[step - 1]}</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {empty ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                Your cart is empty.{" "}
                <Link className="font-semibold underline" href="/">
                  Go back to the store
                </Link>
                .
              </div>
            ) : (
              <>
                {errorMsg && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}

                {/* STEP 1: NAME ONLY */}
                {step === 1 && (
                  <div className="mt-6 grid gap-4">
                    <Field label="Your name">
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Juan D."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
                      />
                    </Field>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Contact + delivery options will be enabled later.
                    </div>
                  </div>
                )}

                {/* STEP 2: PICKUP LOCATION (SELECTABLE) + DELIVERY COMING SOON */}
                {step === 2 && (
                  <div className="mt-6 grid gap-4">
                    <div className="text-sm font-semibold text-slate-900">Pickup location</div>

                    <div className="grid gap-2">
                      <button
                        disabled={!enablePickup}
                        onClick={() => setPickupPoint("boys")}
                        className={[
                          "rounded-2xl border p-4 text-left shadow-sm transition",
                          pickupPoint === "boys"
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
                          !enablePickup ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold">Boys Dorm</div>
                        <div className={pickupPoint === "boys" ? "text-white/80 text-sm" : "text-sm text-slate-600"}>
                          Room 411
                        </div>
                      </button>

                      <button
                        disabled={!enablePickup}
                        onClick={() => setPickupPoint("girls")}
                        className={[
                          "rounded-2xl border p-4 text-left shadow-sm transition",
                          pickupPoint === "girls"
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
                          !enablePickup ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold">Girls Dorm</div>
                        <div className={pickupPoint === "girls" ? "text-white/80 text-sm" : "text-sm text-slate-600"}>
                          Room 206
                        </div>
                      </button>
                    </div>

                    {/* Delivery (disabled + Coming soon) */}
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-90">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">Delivery</div>
                          <div className="text-sm text-slate-600">Campus delivery to your location</div>
                        </div>
                        <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                          Coming soon
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Delivery fee: ₱{(deliveryFeeCents / 100).toFixed(0)} (not active yet)
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: NOT USED (kept for safety, but user never reaches it) */}
                {step === 3 && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Delivery location is currently disabled.
                  </div>
                )}

                {/* STEP 4: PAYMENT */}
                {step === 4 && (
                  <div className="mt-6 grid gap-4">
                    <div className="text-sm font-semibold text-slate-900">Payment method</div>

                    <div className="grid gap-2">
                      <button
                        disabled={!enableGCash}
                        onClick={() => setPaymentMethod("gcash")}
                        className={[
                          "rounded-2xl border p-4 text-left shadow-sm transition",
                          paymentMethod === "gcash"
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
                          !enableGCash ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold">GCash</div>
                        <div className={paymentMethod === "gcash" ? "text-white/80 text-sm" : "text-sm text-slate-600"}>
                          Pay via GCash (enter ref)
                        </div>
                      </button>

                      <button
                        disabled={!enableCOD}
                        onClick={() => setPaymentMethod("cod")}
                        className={[
                          "rounded-2xl border p-4 text-left shadow-sm transition",
                          paymentMethod === "cod"
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
                          !enableCOD ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold">Cash on Pickup</div>
                        <div className={paymentMethod === "cod" ? "text-white/80 text-sm" : "text-sm text-slate-600"}>
                          Pay when you receive it
                        </div>
                      </button>
                    </div>

                    {paymentMethod === "gcash" && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-semibold">GCash payment details</div>

                        <div className="mt-3 grid gap-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-600">Name</span>
                            <span className="font-semibold">{gcashName || "—"}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-600">Number</span>
                            <span className="font-semibold">{gcashNumber || "—"}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-600">Amount</span>
                            <span className="font-semibold">{peso(totalCents)}</span>
                          </div>
                        </div>

                        {gcashInstructions ? (
                          <p className="mt-3 text-xs text-slate-600">{gcashInstructions}</p>
                        ) : (
                          <p className="mt-3 text-xs text-slate-600">Send exact amount, then enter your reference number.</p>
                        )}

                        <div className="mt-4">
                          <label className="text-xs font-semibold text-slate-700">GCash reference number</label>
                          <input
                            value={gcashRef}
                            onChange={(e) => setGcashRef(e.target.value)}
                            placeholder="Enter reference number"
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
                          />
                          <div className="mt-1 text-xs text-slate-500">
                            If you’ll pay after placing the order, enter <span className="font-semibold">TO-FOLLOW</span>.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5: REVIEW */}
                {step === 5 && (
                  <div className="mt-6 grid gap-4">
                    <div className="text-sm font-semibold text-slate-900">Review</div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-sm font-semibold">{customerName}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Pickup • <span className="font-semibold">{fulfillmentText}</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Payment: <span className="font-semibold">{paymentMethod.toUpperCase()}</span>
                        {paymentMethod === "gcash" && gcashRef ? ` • Ref: ${gcashRef}` : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-sm font-semibold">Items</div>
                      <div className="mt-3 space-y-2">
                        {cart.map((i) => (
                          <div key={i.id} className="flex justify-between text-sm">
                            <div className="text-slate-700">
                              {i.qty}× {i.name}
                            </div>
                            <div className="font-semibold tabular-nums">{peso(i.qty * i.price_cents)}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-semibold tabular-nums">{peso(subtotalCents)}</span>
                        </div>

                        <div className="mt-2 flex justify-between text-base">
                          <span className="font-semibold">Total</span>
                          <span className="font-semibold tabular-nums">{peso(totalCents)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={isPending}
                      onClick={placeOrder}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isPending ? "Placing order…" : "Place order"}
                    </button>

                    <div className="text-xs text-slate-500">
                      After placing, you’ll be redirected to your order success page.
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-2">
                  {step !== 1 && (
                    <button
                      onClick={back}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50"
                    >
                      Back
                    </button>
                  )}
                  {step !== 5 && (
                    <button
                      onClick={next}
                      className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                    >
                      Continue
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {!empty && (
            <div className="border-t border-slate-200 bg-slate-50/60 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold tabular-nums">{peso(subtotalCents)}</span>
              </div>

              <div className="mt-2 flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold tabular-nums">{peso(totalCents)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
