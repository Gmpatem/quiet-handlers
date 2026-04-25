// Pure label/formatting helpers for the Orders UI — no JSX.

export const STATUS_LABELS: Record<string, string> = {
  pending: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-stone-100 text-stone-600 border-stone-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  out_for_delivery: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-stone-100 text-stone-600 border-stone-200",
};

export const STATUS_DOT_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-emerald-500",
  completed: "bg-stone-400",
  cancelled: "bg-red-500",
  out_for_delivery: "bg-purple-500",
  delivered: "bg-stone-500",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gcash: "GCash",
  cod: "Cash",
  cash: "Cash",
  credit: "Credit / Deposit",
  deposit: "Credit / Deposit",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Unpaid",
  paid: "Paid",
  verified: "Paid",
  completed: "Paid",
  rejected: "Rejected",
  failed: "Failed",
};

const DORM_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^boys[_-]?(\d+)$/i, (m) => `Boys Dorm ${m[1]}`],
  [/^girls[_-]?(\d+)$/i, (m) => `Girls Dorm ${m[1]}`],
  [/^boys[_-]?dorm$/i, () => "Boys Dorm"],
  [/^girls[_-]?dorm$/i, () => "Girls Dorm"],
];

export function locationLabel(code: string | null | undefined): string {
  if (!code) return "Not specified";
  const trimmed = code.trim();
  for (const [pattern, format] of DORM_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m) return format(m);
  }
  return trimmed.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isDorm(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^(boys|girls)[_-]?(\d+|dorm)$/i.test(code.trim());
}

export function statusLabel(status: string | null | undefined): string {
  return STATUS_LABELS[status ?? "pending"] ?? String(status ?? "Unknown");
}

export function statusColor(status: string | null | undefined): string {
  return (
    STATUS_COLORS[status ?? "pending"] ??
    "bg-stone-100 text-stone-700 border-stone-200"
  );
}

export function statusDotColor(status: string | null | undefined): string {
  return STATUS_DOT_COLORS[status ?? "pending"] ?? "bg-stone-400";
}

export function paymentMethodLabel(method: string | null | undefined): string {
  const key = (method ?? "").toLowerCase();
  return PAYMENT_METHOD_LABELS[key] ?? String(method ?? "—");
}

export function paymentStatusLabel(
  status: string | null | undefined,
  paidAt?: string | null
): string {
  if (paidAt) return "Paid";
  return (
    PAYMENT_STATUS_LABELS[(status ?? "").toLowerCase()] ??
    String(status ?? "Pending")
  );
}

export function peso(cents: number | null | undefined): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

export function timeAgo(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return formatTime(ts);
  } catch {
    return ts;
  }
}

export function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return ts;
  }
}

export function isToday(ts: string): boolean {
  try {
    const d = new Date(ts);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}
