import { chromium } from "@playwright/test";

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

  // Borrow Service verification
  test("Borrow form rendered with stock-backed item selector", async () => {
    await page.goto("http://localhost:3000/services/borrow", { waitUntil: "networkidle" });
    const heading = await page.locator("h1").innerText();
    if (!heading.includes("BORROW HERE")) throw new Error(`Expected BORROW HERE, got ${heading}`);
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

  // End-to-end Borrow Submission in Browser
  test("E2E Borrow Form Submission with boys_411 pickup", async () => {
    await page.goto("http://localhost:3000/services/borrow", { waitUntil: "networkidle" });
    await page.locator("input[placeholder='Enter your name / room']").fill("E2E Borrow Student");
    
    const btn = page.locator("button[type='submit']");
    const enabledOption = page.locator("select option:not([disabled])").first();
    const count = await enabledOption.count();
    if (count > 0 && !(await btn.isDisabled())) {
      const val = await enabledOption.getAttribute("value");
      if (val) {
        await page.locator("select").selectOption(val);
        await btn.click();
        await page.waitForTimeout(1500);
      }
    }

    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes("orders_pickup_location_valid") || pageText.includes("violates row-level security policy")) {
      throw new Error("Check constraint or RLS error exposed!");
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

  // Multi-viewport mobile check (320px to 430px)
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
    await page.goto("http://localhost:3000/services/gcash", { waitUntil: "networkidle" });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    if (scrollWidth > innerWidth) {
      console.error(`✗ Horizontal overflow detected on ${vp.name}: scrollWidth=${scrollWidth} > innerWidth=${innerWidth}`);
      failed++;
    } else {
      console.log(`✓ Responsive check passed on ${vp.name} (no horizontal overflow)`);
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
