type AdminStatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "amber" | "purple";

interface AdminStatusBadgeProps {
  status: string | null | undefined;
  label?: string;
  tone?: AdminStatusBadgeTone;
  size?: "sm" | "md";
}

const STATUS_TONES: Record<string, AdminStatusBadgeTone> = {
  pending: "warning",
  confirmed: "info",
  preparing: "amber",
  ready: "success",
  out_for_delivery: "purple",
  completed: "neutral",
  cancelled: "danger",
  delivered: "success",
  paid: "success",
  verified: "success",
  rejected: "danger",
  active: "success",
  hidden: "neutral",
  low_stock: "warning",
  out_of_stock: "danger",
  depleted: "neutral",
  expired: "danger",
  draft: "neutral",
  scheduled: "info",
  paused: "warning",
};

const TONE_CLASSES: Record<AdminStatusBadgeTone, string> = {
  neutral: "border-stone-200 bg-stone-100 text-stone-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-orange-200 bg-orange-50 text-orange-700",
  purple: "border-purple-200 bg-purple-50 text-purple-700",
};

function humanizeStatus(status: string | null | undefined): string {
  return String(status ?? "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AdminStatusBadge({
  status,
  label,
  tone,
  size = "sm",
}: AdminStatusBadgeProps) {
  const key = String(status ?? "unknown").toLowerCase();
  const badgeTone = tone ?? STATUS_TONES[key] ?? "neutral";

  return (
    <span
      className={[
        "inline-flex max-w-full items-center rounded-lg border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        TONE_CLASSES[badgeTone],
      ].join(" ")}
    >
      <span className="truncate">{label ?? humanizeStatus(status)}</span>
    </span>
  );
}

