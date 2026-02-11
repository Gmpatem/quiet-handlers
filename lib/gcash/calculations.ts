// lib/gcash/calculations.ts
// GCash Service - Calculation & Validation Utilities

export const GCASH_CONFIG = {
  SERVICE_FEE_PERCENTAGE: 0.02, // 2%
  MINIMUM_AMOUNT: 100,
  GCASH_NUMBER: '639994462191',
  GCASH_NAME: 'N.M',
  ROOM_NUMBER: '411',
} as const;

export type TransactionType = 'cash_in' | 'cash_out';

export interface GCashCalculation {
  requestedAmount: number;
  serviceFee: number;
  totalAmount: number;
}

/**
 * Calculate service fee (2% of requested amount)
 */
export function calculateServiceFee(amount: number): number {
  return Math.round(amount * GCASH_CONFIG.SERVICE_FEE_PERCENTAGE * 100) / 100;
}

/**
 * Calculate total amount including fee
 */
export function calculateTotalAmount(requestedAmount: number): GCashCalculation {
  const serviceFee = calculateServiceFee(requestedAmount);
  const totalAmount = requestedAmount + serviceFee;

  return {
    requestedAmount,
    serviceFee,
    totalAmount,
  };
}

/**
 * Validate transaction amount
 */
export function validateAmount(amount: number): {
  isValid: boolean;
  error?: string;
} {
  if (isNaN(amount) || amount <= 0) {
    return {
      isValid: false,
      error: 'Please enter a valid amount',
    };
  }

  if (amount < GCASH_CONFIG.MINIMUM_AMOUNT) {
    return {
      isValid: false,
      error: `Minimum amount is ₱${GCASH_CONFIG.MINIMUM_AMOUNT}`,
    };
  }

  return { isValid: true };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * Format GCash number for display
 */
export function formatGCashNumber(number: string): string {
  // Format as: 0999 444 6219 1
  return number.replace(/(\d{4})(\d{3})(\d{4})(\d)/, '$1 $2 $3 $4');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Generate transaction instructions based on type
 */
export function getTransactionInstructions(
  type: TransactionType,
  calculation: GCashCalculation
): {
  title: string;
  steps: string[];
  paymentInfo: string;
} {
  if (type === 'cash_in') {
    return {
      title: 'Cash-In Instructions',
      steps: [
        `Bring ${formatCurrency(calculation.totalAmount)} cash to Room ${GCASH_CONFIG.ROOM_NUMBER}`,
        `You'll receive ${formatCurrency(calculation.requestedAmount)} in GCash`,
        'Wait for admin confirmation',
      ],
      paymentInfo: `Total to pay: ${formatCurrency(calculation.totalAmount)}`,
    };
  } else {
    return {
      title: 'Cash-Out Instructions',
      steps: [
        `Send ${formatCurrency(calculation.totalAmount)} to the GCash number above`,
        'Upload your payment proof screenshot',
        `Go to Room ${GCASH_CONFIG.ROOM_NUMBER} to collect ${formatCurrency(calculation.requestedAmount)} cash`,
      ],
      paymentInfo: `Total to send: ${formatCurrency(calculation.totalAmount)}`,
    };
  }
}

/**
 * Funny success messages
 */
export const SUCCESS_MESSAGES = [
  "🎉 Nice! Head to Room 411 and let's make it happen!",
  "💰 Cha-ching! Your request is in. See you at Room 411!",
  "✨ Request received! Room 411 is waiting for you!",
  "🚀 All set! Zoom to Room 411 to complete the magic!",
  "🎊 Boom! Request submitted. Room 411 is your next stop!",
  "⚡ Lightning fast! Now dash to Room 411!",
  "🎯 Bulls-eye! Your transaction is queued. Room 411 awaits!",
  "💸 Money moves! Swing by Room 411 to seal the deal!",
] as const;

/**
 * Get random success message
 */
export function getSuccessMessage(): string {
  return SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
}
