import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// 1. Existing Tailwind Merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 2. Peso Formatter (Converts your database cents to ₱ display)
export function formatPeso(cents: number | bigint) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(cents) / 100)
}

// 3. Percentage Formatter (For your Profit Margins)
export function formatMargin(margin: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'percent',
    minimumFractionDigits: 2,
  }).format(margin / 100)
}