"use client";

import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  Check,
  AlertCircle,
} from "lucide-react";
import { statusLabel, statusColor } from "../lib/labels";

function StatusIcon({ status, size }: { status: string | null; size: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  switch (status) {
    case "confirmed":
      return <Check className={cls} />;
    case "preparing":
      return <Clock className={cls} />;
    case "ready":
      return <Package className={cls} />;
    case "completed":
      return <CheckCircle className={cls} />;
    case "delivered":
      return <CheckCircle className={cls} />;
    case "cancelled":
      return <XCircle className={cls} />;
    case "out_for_delivery":
      return <Truck className={cls} />;
    default:
      return <AlertCircle className={cls} />;
  }
}

interface Props {
  status: string | null | undefined;
  size?: "sm" | "md";
}

export function OrderStatusBadge({ status, size = "md" }: Props) {
  const colors = statusColor(status);
  const label = statusLabel(status);
  const padding =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px] gap-0.5"
      : "px-2 py-1 text-xs gap-1";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${colors} ${padding}`}
    >
      <StatusIcon status={status ?? null} size={size} />
      {label}
    </span>
  );
}
