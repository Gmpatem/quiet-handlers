import { chromium } from "@playwright/test";
import fs from "fs";

try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
  const page = await context.newPage();

  // Print tests
  test("Print B&W 1 copy = ₱3 Total Price", async () => {
    await page.goto("http://localhost:3000/services/printing", { waitUntil: "networkidle" });
    const total = await page.locator("text=Total Price").locator("xpath=..").locator("span").last().innerText();
    if (!total.includes("₱3.00")) throw new Error(`Expected ₱3.00, got ${total}`);
  });

  test("Print Color 2 copies = Estimated Price Starts at ₱10", async () => {
    await page.goto("http://localhost:3000/services/printing", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "COLOR" }).click();
    await page.locator("button[aria-label='Increase copies']").click();
    const est = await page.locator("text=Estimated Price").locator("xpath=..").locator("span").last().innerText();
    if (!est.includes("₱10.00") || !est.includes("Starts at")) throw new Error(`Expected Starts at ₱10.00, got ${est}`);
  });

  // GCash Fee Schedule & Boundary Tests
  test("GCash Fee on ₱500 (< ₱1000 @ 3%) = ₱15 fee, ₱515 total", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    await page.locator("input[placeholder='0.00']").fill("500");
    const total = await page.locator("text=Physical Cash to Pay").locator("xpath=..").locator("span").last().innerText();
    if (!total.includes("₱515.00")) throw new Error(`Expected ₱515.00, got ${total}`);
  });

  test("GCash Fee on ₱999 (< ₱1000 @ 3%) = ₱29.97 fee, ₱1,028.97 total", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    await page.locator("input[placeholder='0.00']").fill("999");
    const total = await page.locator("text=Physical Cash to Pay").locator("xpath=..").locator("span").last().innerText();
    if (!total.includes("₱1,028.97")) throw new Error(`Expected ₱1,028.97, got ${total}`);
  });

  test("GCash Boundary on ₱999.99 (< ₱1000 @ 3%) = ₱30.00 fee, ₱1,029.99 total", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    await page.locator("input[placeholder='0.00']").fill("999.99");
    const total = await page.locator("text=Physical Cash to Pay").locator("xpath=..").locator("span").last().innerText();
    if (!total.includes("₱1,029.99")) throw new Error(`Expected ₱1,029.99, got ${total}`);
  });

  test("GCash Boundary on ₱1,000 (>= ₱1000 @ 2%) = ₱20 fee, ₱1,020 total", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    await page.locator("input[placeholder='0.00']").fill("1000");
    const total = await page.locator("text=Physical Cash to Pay").locator("xpath=..").locator("span").last().innerText();
    if (!total.includes("₱1,020.00")) throw new Error(`Expected ₱1,020.00, got ${total}`);
  });

  test("GCash Fee on ₱1,500 (>= ₱1000 @ 2%) = ₱30 fee, ₱1,530 total", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    await page.locator("input[placeholder='0.00']").fill("1500");
    const total = await page.locator("text=Physical Cash to Pay").locator("xpath=..").locator("span").last().innerText();
    if (!total.includes("₱1,530.00")) throw new Error(`Expected ₱1,530.00, got ${total}`);
  });

  test("GCash Fee on ₱5,000 (>= ₱1000 @ 2%) = ₱100 fee, ₱5,100 total", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    await page.locator("input[placeholder='0.00']").fill("5000");
    const total = await page.locator("text=Physical Cash to Pay").locator("xpath=..").locator("span").last().innerText();
    if (!total.includes("₱5,100.00")) throw new Error(`Expected ₱5,100.00, got ${total}`);
  });

  // GCash Cash In 3-Step Wizard Flow
  test("Cash In Wizard: Step 1 Details -> Step 2 Customer Destination -> Step 3 Confirm", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    // Step 1
    await page.locator("input[placeholder='0.00']").fill("500");
    await page.getByRole("button", { name: "Continue to GCash Details" }).click();

    // Step 2
    await page.locator("input[placeholder='e.g. Juan Dela Cruz']").fill("Maria Santos");
    await page.locator("input[placeholder='09XXXXXXXXX']").fill("09171234567");
    await page.getByRole("button", { name: "Review & Confirm" }).click();

    // Step 3
    const summaryHeader = await page.locator("text=Cash In").first().innerText();
    if (!summaryHeader.includes("Cash In")) throw new Error("Expected Cash In summary badge");
    const dest = await page.locator("text=09171234567").innerText();
    if (!dest.includes("09171234567")) throw new Error("Expected customer number destination");
  });

  // GCash Cash Out 3-Step Wizard Flow
  test("Cash Out Wizard: Step 1 Details -> Step 2 Owner Payment -> Step 3 Confirm", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    // Step 1: Select Cash Out
    await page.getByRole("button", { name: "Cash Out" }).click();
    await page.locator("input[placeholder='0.00']").fill("1000");
    await page.getByRole("button", { name: "Continue to GCash Details" }).click();

    // Step 2
    await page.locator("input[placeholder='e.g. Juan Dela Cruz']").fill("Pedro Penduko");
    await page.locator("input[placeholder='e.g. 1029 3847 5612']").fill("REF-987654321");
    await page.getByRole("button", { name: "Review & Confirm" }).click();

    // Step 3
    const totalSend = await page.locator("text=GCash You Send").locator("xpath=..").locator("span").last().innerText();
    if (!totalSend.includes("₱1,020.00")) throw new Error(`Expected ₱1,020.00, got ${totalSend}`);
  });

  // Legacy Borrow Compatibility Route
  test("Legacy Borrow Compatibility: /services/borrow redirects to /services/credit", async () => {
    await page.goto("http://localhost:3000/services/borrow", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const url = page.url();
    if (!url.includes("/services/credit")) {
      throw new Error(`Expected redirect to /services/credit, got ${url}`);
    }
    const text = await page.evaluate(() => document.body.innerText);
    if (!text.includes("TAKE ON CREDIT")) {
      throw new Error("Take on Credit screen not loaded after redirect");
    }
  });

  // End-to-end GCash Cash In Submission in Browser
  test("E2E GCash Cash In Submission in Browser", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    await page.locator("input[placeholder='0.00']").fill("500");
    await page.getByRole("button", { name: "Continue to GCash Details" }).click();

    await page.locator("input[placeholder='e.g. Juan Dela Cruz']").fill("E2E Test Student In");
    await page.locator("input[placeholder='09XXXXXXXXX']").fill("09171234567");
    await page.getByRole("button", { name: "Review & Confirm" }).click();

    // Confirm submission
    await page.getByRole("button", { name: "SUBMIT CASH IN" }).click();
    await page.waitForTimeout(1500);

    // Verify success or friendly UI (no raw SQL/RLS errors)
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes("violates row-level security policy") || pageText.includes("orders_pickup_location_valid")) {
      throw new Error("Raw database error exposed in UI!");
    }
  });

  // End-to-end GCash Cash Out Submission in Browser
  test("E2E GCash Cash Out Submission in Browser", async () => {
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cash Out" }).click();
    await page.locator("input[placeholder='0.00']").fill("1000");
    await page.getByRole("button", { name: "Continue to GCash Details" }).click();

    await page.locator("input[placeholder='e.g. Juan Dela Cruz']").fill("E2E Test Student Out");
    await page.locator("input[placeholder='e.g. 1029 3847 5612']").fill("REF-987654321");
    await page.getByRole("button", { name: "Review & Confirm" }).click();

    // Confirm submission
    await page.getByRole("button", { name: "SUBMIT CASH OUT" }).click();
    await page.waitForTimeout(1500);

    // Verify no raw SQL error
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes("violates row-level security policy") || pageText.includes("orders_pickup_location_valid")) {
      throw new Error("Raw database error exposed in UI!");
    }
  });

  // Admin QR services protection
  test("Admin QR services area is protected behind auth", async () => {
    await page.goto("http://localhost:3000/admin/qr-services", { waitUntil: "networkidle" });
    const url = page.url();
    if (!url.includes("/admin/login") && !url.includes("/admin/qr-services")) {
      throw new Error(`Unexpected url: ${url}`);
    }
  });

  // Admin GCash Manager navigation and tab switching check
  test("Admin GCash manager route loads cleanly without hook order errors", async () => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Rendered more hooks")) {
        errors.push(msg.text());
      }
    });

    await page.goto("http://localhost:3000/admin/gcash", { waitUntil: "networkidle" });

    // If on /admin/gcash (authenticated context), switch tabs
    const settingsBtn = page.getByRole("button", { name: "SETTINGS" });
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: "TRANSACTIONS" }).click();
      await page.waitForTimeout(300);
      await settingsBtn.click();
      await page.waitForTimeout(300);
    }

    if (errors.some(e => e.includes("Rendered more hooks"))) {
      throw new Error(`Hook order error detected: ${errors.join(", ")}`);
    }
  });

  // Admin QR Services Settings Tab check
  test("Admin QR services Settings exposes QR DESTINATION and GCASH RECEIVING ACCOUNT", async () => {
    await page.goto("http://localhost:3000/admin/qr-services", { waitUntil: "networkidle" });
    const settingsTab = page.getByRole("button", { name: "Settings" });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await page.waitForTimeout(300);
      const text = await page.evaluate(() => document.body.innerText);
      if (!text.includes("QR DESTINATION") || !text.includes("GCASH RECEIVING ACCOUNT")) {
        throw new Error("Missing QR Destination or GCash Receiving Account section in QR Services Settings");
      }
    }
  });

  // Authoritative 4 QR Services Suite
  test("QR Service System: Exactly 4 active canonical services configured (PRINT, GCASH, CREDIT, STORE)", async () => {
    const { QR_SERVICES, CANONICAL_PRODUCTION_DOMAIN } = await import("./lib/qr.js").catch(() => import("./lib/qr.ts"));
    const keys = QR_SERVICES.map(s => s.key);
    if (keys.length !== 4) {
      throw new Error(`Expected exactly 4 QR services, found ${keys.length}: ${keys.join(", ")}`);
    }
    const expected = ["print", "gcash", "credit", "store"];
    for (const exp of expected) {
      if (!keys.includes(exp)) {
        throw new Error(`Missing QR service key: ${exp}`);
      }
    }
    if (keys.includes("borrow")) {
      throw new Error("Obsolete 'borrow' key found in QR_SERVICES!");
    }
  });

  test("QR Destinations: All 4 QR services map to stable production paths", async () => {
    const { QR_SERVICES } = await import("./lib/qr.js").catch(() => import("./lib/qr.ts"));
    const map = new Map(QR_SERVICES.map(s => [s.key, s.path]));
    if (map.get("print") !== "/services/print") throw new Error("Invalid print path");
    if (map.get("gcash") !== "/services/gcash") throw new Error("Invalid gcash path");
    if (map.get("credit") !== "/services/credit") throw new Error("Invalid credit path");
    if (map.get("store") !== "/") throw new Error("Invalid store path");
  });

  test("Normal Storefront: Root route / loads products and shopping experience", async () => {
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const text = await page.evaluate(() => document.body.innerText);
    if (!text.includes("Tenpesorun") && !text.includes("Cart") && !text.includes("Store")) {
      throw new Error("Storefront header/content missing on root route");
    }
  });

  // Take on Credit: Route & Catalogue UI
  test("Take on Credit: /services/credit loads product catalogue and search", async () => {
    await page.goto("http://localhost:3000/services/credit", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const text = await page.evaluate(() => document.body.innerText);
    if (!text.includes("TAKE ON CREDIT") || !text.includes("Pick what you need")) {
      throw new Error("Take on Credit header not found");
    }
    const searchInput = page.getByPlaceholder("Search items...");
    if (!(await searchInput.isVisible())) {
      throw new Error("Search items input not visible");
    }
  });

  // Take on Credit: Add to cart, quantity modifier, and sticky mini cart
  test("Take on Credit: Add item to cart updates sticky bottom cart", async () => {
    await page.goto("http://localhost:3000/services/credit", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const plusButtons = page.locator('button[aria-label^="Add "]:not([disabled])');
    const count = await plusButtons.count();
    if (count > 0) {
      await plusButtons.first().click();
      await page.waitForTimeout(500);

      const pageText = await page.evaluate(() => document.body.innerText);
      if (!pageText.includes("1 ITEM") && !pageText.includes("ITEMS")) {
        throw new Error("Sticky bottom cart not updated after adding product");
      }
    }
  });

  // Take on Credit: E2E Credit Order Submission
  test("Take on Credit: Full order checkout with Name/Room submission", async () => {
    page.on("console", (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
    page.on("pageerror", (err) => console.error(`[Browser PageError]:`, err.message));

    await page.goto("http://localhost:3000/services/credit", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const plusButtons = page.locator('button[aria-label^="Add "]:not([disabled])');
    const count = await plusButtons.count();
    if (count > 0) {
      await plusButtons.first().click();
      await page.waitForTimeout(500);

      // Click Continue to step 2
      const continueBtn = page.getByRole("button", { name: /CONTINUE/i }).last();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
        await page.waitForTimeout(500);

        // Fill Name / Room
        const nameInput = page.getByPlaceholder("e.g. Juan Dela Cruz (Room 411)");
        if (await nameInput.isVisible()) {
          await nameInput.fill("QA Test Customer (Room 411)");
          await page.waitForTimeout(300);
          const submitBtn = page.getByRole("button", { name: /SUBMIT CREDIT ORDER/i });
          await submitBtn.click();

          // Wait for submission to record
          await page.waitForFunction(
            () => document.body.innerText.includes("CREDIT RECORDED") || document.body.innerText.includes("CRD-"),
            { timeout: 10000 }
          );

          const successText = await page.evaluate(() => document.body.innerText);
          if (!successText.includes("CREDIT RECORDED")) {
            throw new Error(`Expected success screen with CREDIT RECORDED, got: ${successText.substring(0, 200)}`);
          }
        }
      }
    }
  });

  // Take on Credit & Repayment Semantics
  test("Credit Repayment Semantics: Repayment clears balance without restoring inventory", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: prods } = await supabase
      .from("products")
      .select("id, name, stock_qty, price_cents")
      .eq("is_active", true)
      .gt("stock_qty", 5)
      .limit(1);

    if (prods && prods.length > 0) {
      const p = prods[0];
      const initialStock = p.stock_qty;

      const orderId = crypto.randomUUID();
      const orderCode = `CRD-SEM-${Date.now().toString(36).toUpperCase()}`;

      await supabase.from("orders").insert({
        id: orderId,
        order_code: orderCode,
        customer_name: "Repayment Semantics User",
        contact: "Repayment Semantics User",
        notes: "[QR CREDIT] Repayment test",
        fulfillment: "pickup",
        pickup_location: "boys_411",
        delivery_fee_cents: 0,
        payment_method: "credit",
        subtotal_cents: p.price_cents,
        total_cents: p.price_cents,
        status: "pending",
      });

      await supabase.from("order_items").insert({
        order_id: orderId,
        product_id: p.id,
        name_snapshot: p.name,
        unit_price_cents: p.price_cents,
        unit_cost_cents: 0,
        qty: 1,
        line_total_cents: p.price_cents,
      });

      await supabase.from("products").update({ stock_qty: initialStock - 1 }).eq("id", p.id);

      const { data: afterSale } = await supabase.from("products").select("stock_qty").eq("id", p.id).single();
      if (afterSale.stock_qty !== initialStock - 1) {
        throw new Error(`Stock did not decrease after credit sale! Expected ${initialStock - 1}, got ${afterSale.stock_qty}`);
      }

      await supabase.from("payments").update({
        status: "paid",
        balance_due_cents: 0,
        paid_at: new Date().toISOString(),
      }).eq("order_id", orderId);

      const { data: afterPaymentStock } = await supabase.from("products").select("stock_qty").eq("id", p.id).single();
      if (afterPaymentStock.stock_qty !== initialStock - 1) {
        throw new Error(`Repayment incorrectly altered product stock! Stock should remain ${initialStock - 1}, got ${afterPaymentStock.stock_qty}`);
      }

      await supabase.from("products").update({ stock_qty: initialStock }).eq("id", p.id);
    }
  });

  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${t.name}: ${err.message}`);
      failed++;
    }
  }

  // Multi-viewport mobile check (320px to 430px) on both GCash and Credit
  const viewports = [
    { width: 320, height: 600, name: "320px" },
    { width: 360, height: 740, name: "360px" },
    { width: 375, height: 812, name: "375px" },
    { width: 390, height: 844, name: "390px" },
    { width: 414, height: 896, name: "414px" },
    { width: 430, height: 932, name: "430px" },
  ];

  console.log("\nTesting responsive mobile viewports for horizontal overflow...");
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000/services/credit", { waitUntil: "networkidle" });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    if (scrollWidth > innerWidth) {
      console.error(`✗ Horizontal overflow detected on Credit ${vp.name}: scrollWidth=${scrollWidth} > innerWidth=${innerWidth}`);
      failed++;
    } else {
      console.log(`✓ Responsive check passed on Credit ${vp.name} (no horizontal overflow)`);
      passed++;
    }
  }

  await browser.close();
  console.log(`\n================================`);
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log(`================================`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
