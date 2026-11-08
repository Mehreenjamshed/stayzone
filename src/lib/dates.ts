/**
 * Timezone policy: stay dates are calendar dates (YYYY-MM-DD) with no time
 * component, interpreted in Asia/Karachi. Timestamps are stored in UTC.
 */
export const APP_TZ = "Asia/Karachi";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function todayPK(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(ci: string, co: string) {
  return Math.round((Date.parse(co + "T00:00:00Z") - Date.parse(ci + "T00:00:00Z")) / 86_400_000);
}

export function formatStayDate(iso: string, locale = "en") {
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(iso + "T00:00:00Z"));
}
