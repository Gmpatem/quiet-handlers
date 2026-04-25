"use client";

import type { OrderItemRow } from "../OrdersClient";

interface Props {
  items: OrderItemRow[];
  orderId: string;
  maxItems?: number;
  className?: string;
}

export function OrderItemsPreview({
  items,
  orderId,
  maxItems = 2,
  className = "",
}: Props) {
  const orderItems = items.filter((item) => item.order_id === orderId && item.qty > 0);

  if (orderItems.length === 0) {
    return <span className={`text-xs text-stone-400 ${className}`}>No items yet</span>;
  }

  const preview = orderItems
    .slice(0, maxItems)
    .map((item) => `${item.qty}x ${item.name_snapshot || "Item"}`);

  const remaining = orderItems.length - Math.min(orderItems.length, maxItems);
  if (remaining > 0) {
    preview.push(`+${remaining} more`);
  }

  return (
    <span
      className={`inline-block max-w-[340px] truncate align-middle text-xs text-stone-700 lg:text-sm ${className}`}
    >
      {preview.join(", ")}
    </span>
  );
}
