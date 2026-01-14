"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

type CartItem = {
  id: string; // product id
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

/** Create UUID client-side so we never need to SELECT the inserted order row (RLS-safe) */
function genUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Field({ label, children }: any) {
  return (
    <div className="grid gap-1">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      {children}
    </div>
  );
}

// ---- enum helpers (NO MORE GUESSING) ----
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

  // cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartCount = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);
  const subtotalCents = useMemo(() => cart.reduce((a, i) => a + i.qty * i.price_cents, 0), [cart]);

  // settings (safe defaults)
  const [deliveryFeeCents, setDeliveryFeeCents] = useState<number>(1500); // ₱15 default
  const [enableGCash, setEnableGCash] = useState(true);
  const [enableCOD, setEnableCOD] = useState(true);
  const [enableDelivery, setEnableDelivery] = useState(true);
  const [enablePickup, setEnablePickup] = useState(true);

  // GCash CMS
  const [gcashName, setGcashName] = useState<string>("");
  const [gcashNumber, setGcashNumber] = useState<string>("");
  const [gcashInstructions, setGcashInstructions] = useState<string>("");

  // payment_status enum labels (from RPC)
  const [paymentStatusLabels, setPaymentStatusLabels] = useState<string[]>([]);
  const [paymentStatusDefault, setPaymentStatusDefault] = useState<string>(""); // resolved after RPC

  // wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");

  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery" | "">("");

  // ✅ NEW: pickup location choice
  const [pickupPoint, setPickupPoint] = useState<"boys" | "girls" | "">("");

  const [locationType, setLocationType] = useState<"house" | "room" | "other" | "">("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "cod" | "">("");
  const [gcashRef, setGcashRef] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const feeCents = fulfillment === "delivery" ? deliveryFeeCents : 0;
  const totalCents = subtotalCents + feeCents;

  // Load cart
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  // Load settings + enum labels
  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();

      // 1) app_settings
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

        // your new keys
        if (typeof map.gcash_enabled === "boolean") setEnableGCash(map.gcash_enabled);
        if (typeof map.gcash_name === "string") setGcashName(map.gcash_name);
        if (typeof map.gcash_number === "string") setGcashNumber(map.gcash_number);
        if (typeof map.gcash_instructions === "string") setGcashInstructions(map.gcash_instructions);
      }

      // 2) enum labels via RPC
      const { data: enumArr, error: enumErr } = await supabase.rpc("get_payment_status_enum");
      if (!enumErr && Array.isArray(enumArr) && enumArr.length > 0) {
        const labels = enumArr.map(String);
        setPaymentStatusLabels(labels);
        setPaymentStatusDefault(pickPendingLabel(labels)); // COD default + GCash default
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
      if (!contact.trim()) return setErrorMsg("Please enter your contact (mobile or Messenger).");
      return setStep(2);
    }

    if (step === 2) {
      if (!fulfillment) return setErrorMsg("Please choose Pickup or Delivery.");

      if (fulfillment === "pickup") {
        // ✅ NEW: require pickup point selection
        if (!pickupPoint) return setErrorMsg("Please choose a pickup point (Boys or Girls dorm).");
        return setStep(4);
      }

      return setStep(3);
    }

    if (step === 3) {
      if (!locationType) return setErrorMsg("Please choose House, Room, or Other.");
      if (!deliveryLocation.trim()) return setErrorMsg("Please enter your delivery location.");
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
    if (step === 3) return setStep(2);
    if (step === 4) return fulfillment === "delivery" ? setStep(3) : setStep(2);
    if (step === 5) return setStep(4);
  }

  async function placeOrder() {
    setErrorMsg(null);

    if (empty) return setErrorMsg("Your cart is empty.");
    if (!paymentStatusDefault) return setErrorMsg("Loading settings… please try again.");

    // safety re-check
    if (!customerName.trim()) return setErrorMsg("Please enter your name.");
    if (!contact.trim()) return setErrorMsg("Please enter your contact.");
    if (!fulfillment) return setErrorMsg("Please choose Pickup or Delivery.");

    if (fulfillment === "pickup" && !pickupPoint) {
      return setErrorMsg("Please choose a pickup point (Boys or Girls dorm).");
    }

    if (fulfillment === "delivery" && (!locationType || !deliveryLocation.trim())) {
      return setErrorMsg("Please complete your delivery location.");
    }

    if (!paymentMethod) return setErrorMsg("Please choose a payment method.");
    if (paymentMethod === "gcash" && !gcashRef.trim()) {
      return setErrorMsg("Please enter your GCash reference number (or TO-FOLLOW).");
    }

    startTransition(async () => {
      try {
        const supabase = supabaseBrowser();

        // fetch product snapshots
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

        // ✅ RLS-safe: generate id + code locally so we never need to SELECT the inserted row
        const order_id = genUUID();
        const order_code = genOrderCode();

        // ✅ NEW: encode pickup location into notes (no schema changes needed)
        const pickupLabel =
          pickupPoint === "boys" ? "Pickup: Boys dorm (Room 411)" : pickupPoint === "girls" ? "Pickup: Girls dorm (Room 206)" : "";

        const mergedNotes = [pickupLabel, notes.trim()].filter(Boolean).join(" | ") || null;

        // ✅ delivery_location stays NULL for pickup (matches your DB constraint)
        const delivery_location =
          fulfillment === "delivery" ? `${locationType.toUpperCase()}: ${deliveryLocation.trim()}` : null;

        // insert order (NO select/single)
        const { error: oErr } = await supabase.from("orders").insert({
          id: order_id,
          order_code,
          customer_name: customerName.trim(),
          contact: contact.trim(),
          notes: mergedNotes,
          fulfillment: fulfillment,
          delivery_fee_cents: feeCents,
          delivery_location,
          payment_method: paymentMethod,
          subtotal_cents: subtotalCents,
          total_cents: totalCents,
          status: "pending",
        });

        if (oErr) throw new Error(oErr.message);

        // insert order_items
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

        // insert payment
        const paymentPayload: any = {
          order_id,
          method: paymentMethod,
          amount_cents: totalCents,
          reference_number: paymentMethod === "gcash" ? gcashRef.trim() : null,
          status: paymentStatusDefault,
        };

        const { error: payErr } = await supabase.from("payments").insert(paymentPayload);
        if (payErr) throw new Error(payErr.message);

        // clear cart
        try {
          localStorage.removeItem(CART_KEY);
        } catch {}

        // redirect using local order_code (no DB read)
        window.location.href = `/order/success/${order_code}`;
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to place order.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            ← Back to store
          </Link>
          <div className="text-xs text-slate-500">{cartCount ? `${cartCount} item(s)` : " "}</div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-3xl border border-slate-200 p-5 sm:p-8">
          <div className="text-xl font-semibold">Checkout</div>
          <div className="mt-1 text-sm text-slate-600">Fast campus order, no account needed.</div>

          {empty ? (
            <div className="mt-6 rounded-2xl border border-slate-200 p-5 text-sm text-slate-700">
              Your cart is empty.{" "}
              <Link className="font-semibold underline" href="/">
                Go back to the store
              </Link>
              .
            </div>
          ) : (
            <>
              <div className="mt-5 flex gap-2 text-xs">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n === step;
                  const done = n < step;
                  return (
                    <div
                      key={n}
                      className={[
                        "flex-1 rounded-full border px-2 py-1 text-center",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : done
                            ? "border-slate-200 bg-slate-50 text-slate-700"
                            : "border-slate-200 text-slate-500",
                      ].join(" ")}
                    >
                      Step {n}
                    </div>
                  );
                })}
              </div>

              {errorMsg && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* STEP 1 */}
              {step === 1 && (
                <div className="mt-6 grid gap-4">
                  <Field label="Your name">
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Juan D."
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                    />
                  </Field>

                  <Field label="Contact (required)">
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Mobile number or Messenger name"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                    />
                    <div className="mt-1 text-xs text-slate-500">Example: 09xx… or “Juan (Messenger)”</div>
                  </Field>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="mt-6 grid gap-3">
                  <div className="text-sm font-semibold text-slate-900">How would you like it?</div>

                  <button
                    disabled={!enablePickup}
                    onClick={() => {
                      setFulfillment("pickup");
                      // keep pickup selection, but reset delivery fields for cleanliness
                      setLocationType("");
                      setDeliveryLocation("");
                    }}
                    className={[
                      "rounded-2xl border p-4 text-left",
                      fulfillment === "pickup"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 hover:bg-slate-50",
                      !enablePickup ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <div className="font-semibold">Pickup</div>
                    <div className={fulfillment === "pickup" ? "text-white/80 text-sm" : "text-sm text-slate-600"}>
                      Pick up at dorm drop points
                    </div>
                  </button>

                  {/* ✅ NEW: show pickup points when pickup is chosen */}
                  {fulfillment === "pickup" && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">Choose pickup point</div>
                      <div className="mt-3 grid gap-2">
                        <button
                          onClick={() => setPickupPoint("boys")}
                          className={[
                            "rounded-2xl border px-4 py-3 text-left text-sm",
                            pickupPoint === "boys"
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="font-semibold">Boys Dorm</div>
                          <div className={pickupPoint === "boys" ? "text-white/80" : "text-slate-600"}>Room 411</div>
                        </button>

                        <button
                          onClick={() => setPickupPoint("girls")}
                          className={[
                            "rounded-2xl border px-4 py-3 text-left text-sm",
                            pickupPoint === "girls"
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="font-semibold">Girls Dorm</div>
                          <div className={pickupPoint === "girls" ? "text-white/80" : "text-slate-600"}>Room 206</div>
                        </button>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        We’ll record this pickup point in your order notes for the admin.
                      </div>
                    </div>
                  )}

                  <button
                    disabled={!enableDelivery}
                    onClick={() => {
                      setFulfillment("delivery");
                      // reset pickup selection to avoid confusion
                      setPickupPoint("");
                    }}
                    className={[
                      "rounded-2xl border p-4 text-left",
                      fulfillment === "delivery"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 hover:bg-slate-50",
                      !enableDelivery ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <div className="font-semibold">Delivery</div>
                    <div className={fulfillment === "delivery" ? "text-white/80 text-sm" : "text-sm text-slate-600"}>
                      Campus delivery to your location
                    </div>
                  </button>

                  {/* fee hint immediately */}
                  {fulfillment === "delivery" && (
                    <div className="ml-1 text-sm text-slate-600">
                      Delivery fee <span className="font-semibold">(+₱{(deliveryFeeCents / 100).toFixed(0)})</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="mt-6 grid gap-4">
                  <div className="text-sm font-semibold text-slate-900">Delivery location</div>

                  <div className="grid grid-cols-3 gap-2">
                    {(["house", "room", "other"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setLocationType(t)}
                        className={[
                          "rounded-2xl border px-3 py-3 text-sm font-semibold",
                          locationType === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <Field label="Where exactly?">
                    <input
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      placeholder="e.g. House 12 near library | Room 203 Building B | Other: ..."
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                    />
                  </Field>

                  <Field label="Notes (optional)">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Landmarks, gate instructions, please call, etc."
                      className="h-24 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                    />
                  </Field>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="mt-6 grid gap-4">
                  <div className="text-sm font-semibold text-slate-900">Payment method</div>

                  <div className="grid gap-2">
                    <button
                      disabled={!enableGCash}
                      onClick={() => setPaymentMethod("gcash")}
                      className={[
                        "rounded-2xl border p-4 text-left",
                        paymentMethod === "gcash"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 hover:bg-slate-50",
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
                        "rounded-2xl border p-4 text-left",
                        paymentMethod === "cod"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 hover:bg-slate-50",
                        !enableCOD ? "opacity-50 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      <div className="font-semibold">Cash on Delivery</div>
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
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
                        />
                        <div className="mt-1 text-xs text-slate-500">
                          If you’ll pay after placing the order, enter <span className="font-semibold">TO-FOLLOW</span>.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5 */}
              {step === 5 && (
                <div className="mt-6 grid gap-4">
                  <div className="text-sm font-semibold text-slate-900">Review</div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-semibold">{customerName}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Contact: <span className="font-semibold">{contact}</span>
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                      {fulfillment === "pickup" ? (
                        <>
                          Pickup •{" "}
                          <span className="font-semibold">
                            {pickupPoint === "boys"
                              ? "Boys dorm (Room 411)"
                              : pickupPoint === "girls"
                                ? "Girls dorm (Room 206)"
                                : "—"}
                          </span>
                        </>
                      ) : (
                        <>
                          Delivery • {locationType.toUpperCase()}: {deliveryLocation}
                        </>
                      )}
                    </div>

                    {notes?.trim() ? <div className="mt-1 text-sm text-slate-600">Notes: {notes}</div> : null}

                    <div className="mt-2 text-sm text-slate-600">
                      Payment: <span className="font-semibold">{paymentMethod.toUpperCase()}</span>
                      {paymentMethod === "gcash" && gcashRef ? ` • Ref: ${gcashRef}` : ""}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-semibold">Items</div>
                    <div className="mt-3 space-y-2">
                      {cart.map((i) => (
                        <div key={i.id} className="flex justify-between text-sm">
                          <div className="text-slate-700">
                            {i.qty}× {i.name}
                          </div>
                          <div className="font-semibold">{peso(i.qty * i.price_cents)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-semibold">{peso(subtotalCents)}</span>
                      </div>

                      {fulfillment === "delivery" && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Delivery fee</span>
                          <span className="font-semibold">{peso(deliveryFeeCents)}</span>
                        </div>
                      )}

                      <div className="mt-2 flex justify-between text-base">
                        <span className="font-semibold">Total</span>
                        <span className="font-semibold">{peso(totalCents)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isPending}
                    onClick={placeOrder}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isPending ? "Placing order…" : "Place order"}
                  </button>

                  <div className="text-xs text-slate-500">After placing, you’ll be redirected to your order success page.</div>
                </div>
              )}

              <div className="mt-6 flex gap-2">
                {step !== 1 && (
                  <button
                    onClick={back}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    Back
                  </button>
                )}
                {step !== 5 && (
                  <button
                    onClick={next}
                    className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Continue
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {!empty && (
          <div className="mt-4 rounded-3xl border border-slate-200 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold">{peso(subtotalCents)}</span>
            </div>
            {fulfillment === "delivery" && (
              <div className="flex justify-between">
                <span className="text-slate-600">Delivery fee</span>
                <span className="font-semibold">{peso(deliveryFeeCents)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{peso(totalCents)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
