import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function daysUntil(date: Date | string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const VENDOR_CATEGORIES = [
  { value: "FOOD_BEVERAGE", label: "Food & Beverage Distributor" },
  { value: "CLEANING", label: "Cleaning Service" },
  { value: "LINEN_LAUNDRY", label: "Linen / Laundry" },
  { value: "POS_SOFTWARE", label: "POS / Software" },
  { value: "DELIVERY_PLATFORM", label: "Delivery Platform" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SHIPPING_PACKAGING", label: "Shipping & Packaging" },
  { value: "EQUIPMENT_RENTAL", label: "Equipment Rental" },
  { value: "OTHER", label: "Other" },
] as const;

export const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant / Food & Beverage" },
  { value: "retail", label: "Retail Shop" },
  { value: "contractor", label: "Contractor / Trades" },
  { value: "healthcare", label: "Healthcare / Clinic" },
  { value: "hospitality", label: "Hotel / Hospitality" },
  { value: "other", label: "Other" },
] as const;

export const MONTHLY_REVENUE_RANGES = [
  { value: "under_25k", label: "Under $25,000/mo" },
  { value: "25k_50k", label: "$25,000 – $50,000/mo" },
  { value: "50k_100k", label: "$50,000 – $100,000/mo" },
  { value: "100k_250k", label: "$100,000 – $250,000/mo" },
  { value: "over_250k", label: "Over $250,000/mo" },
] as const;

export function getClassificationColor(classification: string) {
  switch (classification) {
    case "FAIR":
      return "bg-green-100 text-green-800";
    case "ELEVATED":
      return "bg-yellow-100 text-yellow-800";
    case "OVERPRICED":
      return "bg-red-100 text-red-800";
    case "BENCHMARKING":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function getClassificationLabel(classification: string) {
  switch (classification) {
    case "FAIR":
      return "Fair Price";
    case "ELEVATED":
      return "Slightly High";
    case "OVERPRICED":
      return "Overpriced";
    case "BENCHMARKING":
      return "Benchmarking...";
    default:
      return "Unknown";
  }
}

export function estimateAnnualSavings(
  monthlyAmount: number,
  marketRateTypical: number | null
): number {
  if (!marketRateTypical) return 0;
  return Math.max(0, (monthlyAmount - marketRateTypical) * 12);
}
