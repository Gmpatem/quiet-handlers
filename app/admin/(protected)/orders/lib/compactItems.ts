type CompactOrderItem = {
  qty: number;
  name_snapshot: string | null;
};

export type CompactItemsPreview = {
  primary: string;
  additionalCount: number;
  fullText: string;
};

function compactProductName(name: string) {
  const cleaned = name
    .replace(/\s*\((?:chilled|cold)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hoMi = cleaned.match(/^ho-?mi\s+instant\s+mami\s+noodles\s+(.+)$/i);
  if (hoMi) return `Ho-Mi ${hoMi[1]}`.trim();

  const pancit = cleaned.match(/^(?:lucky\s+me\s+)?pancit\s+canton\s+(.+)$/i);
  if (pancit) return `Pancit Canton ${pancit[1]}`.trim();

  const mangJuan = cleaned.match(/^chicharo\s+ni\s+mang\s+juan\s+(.+)$/i);
  if (mangJuan) return `Mang Juan ${mangJuan[1]}`.trim();

  return cleaned.length > 28 ? `${cleaned.slice(0, 25).trim()}...` : cleaned;
}

function lineForItem(item: CompactOrderItem, compact = true) {
  const name = item.name_snapshot?.trim() || "Item";
  return `${item.qty}× ${compact ? compactProductName(name) : name}`;
}

export function getCompactItemsPreview(items: CompactOrderItem[]): CompactItemsPreview {
  const available = items.filter((item) => item.qty > 0);
  const fullText = available.map((item) => lineForItem(item, false)).join("\n");

  if (!available.length) {
    return { primary: "No items", additionalCount: 0, fullText: "No items" };
  }

  if (available.length === 1) {
    return {
      primary: lineForItem(available[0]),
      additionalCount: 0,
      fullText,
    };
  }

  const first = lineForItem(available[0]);
  const second = lineForItem(available[1]);
  const twoItemPreview = `${first}, ${second}`;

  if (available.length === 2 && twoItemPreview.length <= 42) {
    return {
      primary: twoItemPreview,
      additionalCount: 0,
      fullText,
    };
  }

  return {
    primary: first,
    additionalCount: available.length - 1,
    fullText,
  };
}
