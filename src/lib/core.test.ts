import { describe, expect, it } from "vitest";
import { convertMinor, formatMoney, parseMajorToMinor } from "./money";
import { addDays, isIsoDate, nightsBetween, todayPK } from "./dates";
import { parseSearchParams, toQueryString } from "./search-params";
import { safeNext } from "./utils";
import { bookingErrorMessage } from "./booking-errors";

describe("money", () => {
  it("formats PKR minor units without decimals", () => {
    expect(formatMoney(2_080_000, "PKR")).toMatch(/PKR\s?20,800/);
  });
  it("converts major to minor exactly", () => {
    expect(parseMajorToMinor("20,000")).toBe(2_000_000);
    expect(parseMajorToMinor("-5")).toBeNull();
    expect(parseMajorToMinor("abc")).toBeNull();
  });
  it("conversion is indicative and returns null without a rate", () => {
    expect(convertMinor(2_800_000, "USD", { USD: 0.00357 })).toBe(9996);
    expect(convertMinor(100, "GBP", {})).toBeNull();
    expect(convertMinor(100, "PKR", {})).toBe(100);
  });
});

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("28/02/2026")).toBe(false);
  });
  it("counts nights across DST-free calendar days", () => {
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("search params", () => {
  const future = addDays(todayPK(), 10);
  it("drops invalid or past dates", () => {
    expect(parseSearchParams({ checkin: "2020-01-01", checkout: "2020-01-03" }).checkin).toBeUndefined();
    expect(parseSearchParams({ checkin: future, checkout: future }).checkin).toBeUndefined();
    expect(parseSearchParams({ checkin: future, checkout: addDays(future, 2) }).checkout).toBe(addDays(future, 2));
  });
  it("ignores unknown filter values instead of crashing", () => {
    const p = parseSearchParams({ type: "SPACESHIP", sort: "hack", adults: "-3", amenity: "wifi,unknown" });
    expect(p.type).toEqual([]);
    expect(p.sort).toBe("recommended");
    expect(p.adults).toBeUndefined();
  });
  it("swaps reversed price bounds and round-trips to a query string", () => {
    const p = parseSearchParams({ min: "50000", max: "10000", type: "VILLA,FARMHOUSE" });
    expect([p.min, p.max]).toEqual([10000, 50000]);
    expect(toQueryString(p)).toContain("type=VILLA%2CFARMHOUSE");
  });
});

describe("security helpers", () => {
  it("prevents open redirects after login", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
  });
  it("maps engine errors to friendly messages", () => {
    expect(bookingErrorMessage("MIN_NIGHTS:3")).toContain("3 nights");
    expect(bookingErrorMessage("something unexpected")).toMatch(/couldn't complete/);
  });
});
