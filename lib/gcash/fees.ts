export type GCashTransactionType = "cash_in" | "cash_out";

export type GCashFeeRule = {
  min_amount: number;
  max_amount: number | null;
  flat_fee: number;
  percentage: number;
  min_fee: number;
  max_fee: number;
};

export type GCashFeeSettings = {
  gcash_fee_rules: GCashFeeRule[];
  gcash_account_name: string;
  gcash_account_number: string;
  gcash_qr_url?: string;
};

export type GCashCalculation = {
  amount: number;
  serviceFee: number;
  finalAmount: number;
  rule: GCashFeeRule | null;
};

export const DEFAULT_GCASH_FEE_RULES: GCashFeeRule[] = [
  {
    min_amount: 0,
    max_amount: 999.99,
    flat_fee: 0,
    percentage: 3,
    min_fee: 0,
    max_fee: 0,
  },
  {
    min_amount: 1000,
    max_amount: null,
    flat_fee: 0,
    percentage: 2,
    min_fee: 0,
    max_fee: 0,
  },
];

export function formatPeso(amount: number): string {
  return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function parseFeeRules(value: unknown): GCashFeeRule[] {
  if (!Array.isArray(value)) return DEFAULT_GCASH_FEE_RULES;
  const parsed = value
    .map((rule: any) => ({
      min_amount: Number(rule?.min_amount ?? 0),
      max_amount: rule?.max_amount === null || rule?.max_amount === undefined ? null : Number(rule.max_amount),
      flat_fee: Number(rule?.flat_fee ?? 0),
      percentage: Number(rule?.percentage ?? 0),
      min_fee: Number(rule?.min_fee ?? 0),
      max_fee: Number(rule?.max_fee ?? 0),
    }))
    .filter(
      (rule) =>
        Number.isFinite(rule.min_amount) &&
        Number.isFinite(rule.flat_fee) &&
        Number.isFinite(rule.percentage)
    );
  if (parsed.length === 0) return DEFAULT_GCASH_FEE_RULES;
  if (
    parsed.length === 1 &&
    parsed[0].min_amount === 0 &&
    parsed[0].max_amount === null &&
    parsed[0].percentage === 2 &&
    parsed[0].flat_fee === 0
  ) {
    return DEFAULT_GCASH_FEE_RULES;
  }
  return parsed;
}

export function findMatchingFeeRule(
  rules: GCashFeeRule[],
  amount: number
): GCashFeeRule | null {
  return (
    rules.find((rule) => {
      const aboveMin = amount >= rule.min_amount;
      const belowMax = rule.max_amount === null || amount <= rule.max_amount;
      return aboveMin && belowMax;
    }) ?? null
  );
}

export function calculateGCashFee(
  rules: GCashFeeRule[],
  amount: number
): GCashCalculation {
  const rule = findMatchingFeeRule(rules, amount);
  if (!rule) {
    return { amount, serviceFee: 0, finalAmount: amount, rule: null };
  }

  let fee = rule.flat_fee + amount * (rule.percentage / 100);
  if (rule.min_fee > 0) fee = Math.max(fee, rule.min_fee);
  if (rule.max_fee > 0) fee = Math.min(fee, rule.max_fee);

  fee = Math.round(fee * 100) / 100;
  const finalAmount = amount + fee;

  return {
    amount,
    serviceFee: fee,
    finalAmount: Math.round(finalAmount * 100) / 100,
    rule,
  };
}

export function validateGCashSubmission(
  type: string,
  amount: number,
  serviceFee: number,
  finalAmount: number,
  rules: GCashFeeRule[],
  minAmount = 1,
  maxAmount = 100000
): { valid: boolean; error?: string } {
  if (!["cash_in", "cash_out"].includes(type)) {
    return { valid: false, error: "Invalid transaction type" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: "Please enter a valid amount" };
  }
  if (amount < minAmount) {
    return { valid: false, error: `Minimum amount is ₱${minAmount}` };
  }
  if (amount > maxAmount) {
    return { valid: false, error: `Maximum amount is ₱${maxAmount.toLocaleString()}` };
  }
  const expected = calculateGCashFee(rules, amount);
  if (Math.abs(serviceFee - expected.serviceFee) > 0.01) {
    return { valid: false, error: "Invalid service fee calculation" };
  }
  if (Math.abs(finalAmount - expected.finalAmount) > 0.01) {
    return { valid: false, error: "Invalid total calculation" };
  }
  return { valid: true };
}
