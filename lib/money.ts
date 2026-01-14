export function formatPHP(cents: number) {
  const pesos = (cents ?? 0) / 100;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(pesos);
}
