export type ColorType = "bw" | "color";
export type PaperSize = "a4" | "long" | "a3";
export type SidedType = "single" | "double";

export type PrintPricingSettings = {
  print_price_bw: number;
  print_price_color: number;
  print_a4_adjustment: number;
  print_long_adjustment: number;
  print_a3_adjustment: number;
  print_double_sided_adjustment: number;
};

export type PrintPricingLineItem = {
  label: string;
  amount: number;
};

export type PrintPricingResult = {
  basePrice: number;
  paperSizeAdjustment: number;
  sidesAdjustment: number;
  unitPrice: number;
  copies: number;
  total: number;
  lineItems: PrintPricingLineItem[];
  snapshot: PrintPricingSettings & { unitPrice: number; total: number };
};

export const DEFAULT_PRINT_PRICING: PrintPricingSettings = {
  print_price_bw: 3,
  print_price_color: 5,
  print_a4_adjustment: 0,
  print_long_adjustment: 0,
  print_a3_adjustment: 0,
  print_double_sided_adjustment: 0,
};

export function formatPeso(amount: number): string {
  return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function calculatePrintPrice(
  settings: PrintPricingSettings,
  color: ColorType,
  paperSize: PaperSize,
  copies: number,
  sided: SidedType
): PrintPricingResult {
  const copiesSafe = Math.max(1, Math.floor(copies || 1));
  const basePrice = color === "color" ? settings.print_price_color : settings.print_price_bw;

  const paperSizeAdjustmentMap: Record<PaperSize, number> = {
    a4: settings.print_a4_adjustment,
    long: settings.print_long_adjustment,
    a3: settings.print_a3_adjustment,
  };
  const paperSizeAdjustment = paperSizeAdjustmentMap[paperSize] ?? 0;

  const sidesAdjustment = sided === "double" ? settings.print_double_sided_adjustment : 0;

  const unitPrice = basePrice + paperSizeAdjustment + sidesAdjustment;
  const total = unitPrice * copiesSafe;

  const lineItems: PrintPricingLineItem[] = [
    { label: color === "bw" ? "B&W" : "Color", amount: basePrice },
    { label: paperSize.toUpperCase(), amount: paperSizeAdjustment },
    { label: `${copiesSafe} Copy${copiesSafe > 1 ? "ies" : ""}`, amount: unitPrice * copiesSafe },
    { label: sided === "single" ? "Single Side" : "Double Side", amount: sidesAdjustment },
  ];

  return {
    basePrice,
    paperSizeAdjustment,
    sidesAdjustment,
    unitPrice,
    copies: copiesSafe,
    total,
    lineItems,
    snapshot: {
      ...settings,
      unitPrice,
      total,
    },
  };
}

export function validatePrintSubmission(
  studentName: string,
  color: string,
  paperSize: string,
  copies: number,
  sided: string,
  totalAmount: number,
  expectedTotal: number
): { valid: boolean; error?: string } {
  if (!studentName || studentName.trim().length < 2) {
    return { valid: false, error: "Please enter your name" };
  }
  if (!["bw", "color"].includes(color)) {
    return { valid: false, error: "Invalid color mode" };
  }
  if (!["a4", "long", "a3"].includes(paperSize)) {
    return { valid: false, error: "Invalid paper size" };
  }
  if (!Number.isFinite(copies) || copies < 1 || copies > 9999) {
    return { valid: false, error: "Invalid number of copies" };
  }
  if (!["single", "double"].includes(sided)) {
    return { valid: false, error: "Invalid sided option" };
  }
  if (Math.abs(totalAmount - expectedTotal) > 0.01) {
    return { valid: false, error: "Price calculation mismatch" };
  }
  return { valid: true };
}
