/**
 * Money is stored and charged in MINOR units (paisa) of the property's currency (PKR).
 * Display conversion is indicative only — guests are always charged in PKR.
 */
export const CHARGE_CURRENCY = "PKR";
export const DISPLAY_CURRENCIES = ["PKR", "USD", "GBP", "EUR", "AED", "SAR"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

const MINOR_DIGITS: Record<string, number> = { PKR: 2, USD: 2, GBP: 2, EUR: 2, AED: 2, SAR: 2 };

export function isDisplayCurrency(c: unknown): c is DisplayCurrency {
  return typeof c === "string" && (DISPLAY_CURRENCIES as readonly string[]).includes(c);
}

export function formatMoney(minor: number | bigint | string, currency = CHARGE_CURRENCY, locale = "en") {
  const digits = MINOR_DIGITS[currency] ?? 2;
  const major = Number(minor) / 10 ** digits;
  return new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(major);
}

/** Indicative conversion using admin-configured rates (units of currency per 1 PKR). */
export function convertMinor(minorPkr: number, to: DisplayCurrency, rates: Partial<Record<DisplayCurrency, number>>) {
  if (to === "PKR") return minorPkr;
  const r = rates[to];
  return r ? Math.round(minorPkr * r) : null;
}

export function parseMajorToMinor(input: string | number): number | null {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[, ]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
