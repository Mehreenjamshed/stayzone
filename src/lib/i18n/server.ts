import "server-only";
import { cookies } from "next/headers";
import { en, ur, type Dictionary } from "./dictionaries";
import { isDisplayCurrency, type DisplayCurrency } from "@/lib/money";

export type Locale = "en" | "ur";
export const LOCALE_COOKIE = "sz_locale";
export const CURRENCY_COOKIE = "sz_currency";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "ur" ? "ur" : "en";
}

export async function getDisplayCurrency(): Promise<DisplayCurrency> {
  const v = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return isDisplayCurrency(v) ? v : "PKR";
}

export async function getDictionary(): Promise<{ t: Dictionary; locale: Locale; dir: "ltr" | "rtl" }> {
  const locale = await getLocale();
  return { t: locale === "ur" ? ur : en, locale, dir: locale === "ur" ? "rtl" : "ltr" };
}
