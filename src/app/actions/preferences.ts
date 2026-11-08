"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENCY_COOKIE, LOCALE_COOKIE } from "@/lib/i18n/server";
import { isDisplayCurrency } from "@/lib/money";
import { getSessionUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const YEAR = 60 * 60 * 24 * 365;

export async function setPreferences(formData: FormData) {
  const store = await cookies();
  const locale = formData.get("locale");
  const currency = formData.get("currency");
  const update: Record<string, string> = {};
  if (locale === "en" || locale === "ur") {
    store.set(LOCALE_COOKIE, locale, { maxAge: YEAR, sameSite: "lax", path: "/" });
    update.preferred_language = locale;
  }
  if (isDisplayCurrency(currency)) {
    store.set(CURRENCY_COOKIE, currency, { maxAge: YEAR, sameSite: "lax", path: "/" });
    update.preferred_currency = currency;
  }
  const user = await getSessionUser();
  if (user && Object.keys(update).length) {
    const supabase = await createClient();
    await supabase.from("profiles").update(update).eq("id", user.id);
  }
  revalidatePath("/", "layout");
}
