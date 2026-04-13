/**
 * Pricing Engine - Pack E Foundation
 * 
 * Handles:
 * - Base subtotal calculation
 * - Offer application (combo, threshold, etc.)
 * - Savings calculation
 * - Final total with offers
 * 
 * V1: Basic structure ready for future offer expansion
 */

export type CartItem = {
  id: string;
  name: string;
  price_cents: number;
  qty: number;
};

export type AppliedOffer = {
  id: string;
  name: string;
  type: string;
  discount_cents: number;
  badge_text?: string;
  description?: string;
};

export type PricingResult = {
  // Base values
  subtotal_cents: number;
  delivery_fee_cents: number;
  
  // Offer adjustments
  discount_cents: number;
  savings_cents: number;
  applied_offers: AppliedOffer[];
  
  // Final
  total_cents: number;
  
  // Display helpers
  formatted: {
    subtotal: string;
    delivery_fee: string;
    discount: string | null;
    savings: string | null;
    total: string;
  };
};

function peso(cents: number): string {
  return new Intl.NumberFormat("en-PH", { 
    style: "currency", 
    currency: "PHP" 
  }).format((cents ?? 0) / 100);
}

/**
 * Calculate base subtotal from cart items
 */
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty * item.price_cents, 0);
}

/**
 * Check if items qualify for a combo offer
 * V1: Basic combo detection - can be expanded
 */
export function checkComboQualification(
  items: CartItem[],
  comboConfig: { product_ids: string[]; qty_per_product: number }
): boolean {
  for (const productId of comboConfig.product_ids) {
    const item = items.find(i => i.id === productId);
    if (!item || item.qty < comboConfig.qty_per_product) {
      return false;
    }
  }
  return true;
}

/**
 * Check threshold qualification
 */
export function checkThresholdQualification(
  subtotal_cents: number,
  threshold_cents: number
): boolean {
  return subtotal_cents >= threshold_cents;
}

/**
 * Main pricing calculation
 * 
 * V1: Calculates base values and prepares structure for offers
 * Future: Will apply active offers from database
 */
export function calculatePricing(
  items: CartItem[],
  options: {
    delivery_fee_cents?: number;
    active_offers?: any[]; // Will be typed properly when offers are fully integrated
  } = {}
): PricingResult {
  const deliveryFee = options.delivery_fee_cents ?? 0;
  const subtotal = calculateSubtotal(items);
  
  // V1: No automatic offer application yet
  // Future: Check active_offers and apply qualifying ones
  const discount = 0;
  const savings = 0;
  const appliedOffers: AppliedOffer[] = [];
  
  // Calculate total
  const total = subtotal + deliveryFee - discount;
  
  return {
    subtotal_cents: subtotal,
    delivery_fee_cents: deliveryFee,
    discount_cents: discount,
    savings_cents: savings,
    applied_offers: appliedOffers,
    total_cents: total,
    formatted: {
      subtotal: peso(subtotal),
      delivery_fee: deliveryFee > 0 ? peso(deliveryFee) : "Free",
      discount: discount > 0 ? `-${peso(discount)}` : null,
      savings: savings > 0 ? peso(savings) : null,
      total: peso(total),
    },
  };
}

/**
 * Preview combo pricing for a specific combo
 * Returns what the price would be if combo is applied
 */
export function previewComboPrice(
  items: CartItem[],
  combo: {
    product_ids: string[];
    combo_price_cents: number;
  }
): { 
  qualifies: boolean; 
  regular_price: number; 
  combo_price: number; 
  savings: number;
} | null {
  const qualifyingItems = items.filter(i => combo.product_ids.includes(i.id));
  
  if (qualifyingItems.length < combo.product_ids.length) {
    return null; // Doesn't qualify
  }
  
  const regularPrice = qualifyingItems.reduce((sum, item) => 
    sum + item.qty * item.price_cents, 0
  );
  
  return {
    qualifies: true,
    regular_price: regularPrice,
    combo_price: combo.combo_price_cents,
    savings: regularPrice - combo.combo_price_cents,
  };
}

/**
 * Format pricing for display
 */
export function formatPricingDisplay(result: PricingResult) {
  return {
    ...result.formatted,
    hasDiscount: result.discount_cents > 0,
    hasSavings: result.savings_cents > 0,
    offerCount: result.applied_offers.length,
  };
}
