/**
 * TypeScript mirror of public.quote_booking() (migration 0004), used ONLY by the
 * database-free demo mode. The real app always prices bookings in PostgreSQL.
 * tests/db/pricing-parity.test.ts checks both give identical results.
 */
import { nightsBetween, addDays } from "./dates";

export type PriceListing = {
  base_guests: number; max_guests: number; nightly_price_minor: number; weekend_price_minor: number | null;
  cleaning_fee_minor: number; extra_guest_fee_minor: number; security_deposit_minor: number;
  weekly_discount_bps: number; monthly_discount_bps: number; min_nights: number; max_nights: number;
};
export type Fees = { guestBps: number; commissionBps: number; taxBps: number };

export class QuoteError extends Error {}

/** Postgres round() on numeric rounds half away from zero. */
const pgRound = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

export function quote(l: PriceListing, ci: string, co: string, adults: number, children: number, fees: Fees, opts: { today: string; childrenAllowed?: boolean }) {
  if (!ci || !co) throw new QuoteError("DATES_REQUIRED");
  if (co <= ci) throw new QuoteError("CHECKOUT_BEFORE_CHECKIN");
  if (ci < opts.today) throw new QuoteError("CHECKIN_IN_PAST");
  if (adults < 1 || children < 0) throw new QuoteError("INVALID_GUESTS");
  if (adults + children > l.max_guests) throw new QuoteError("TOO_MANY_GUESTS");
  if (children > 0 && opts.childrenAllowed === false) throw new QuoteError("CHILDREN_NOT_ALLOWED");
  const nights = nightsBetween(ci, co);
  if (nights < l.min_nights) throw new QuoteError(`MIN_NIGHTS:${l.min_nights}`);
  if (nights > l.max_nights) throw new QuoteError(`MAX_NIGHTS:${l.max_nights}`);

  const nightly: { date: string; price_minor: number }[] = [];
  let accommodation = 0;
  for (let d = ci; d < co; d = addDays(d, 1)) {
    const dow = new Date(d + "T00:00:00Z").getUTCDay(); // 5 = Fri, 6 = Sat (ISO dow 5,6)
    const price = (dow === 5 || dow === 6) && l.weekend_price_minor ? l.weekend_price_minor : l.nightly_price_minor;
    nightly.push({ date: d, price_minor: price });
    accommodation += price;
  }
  const discount_bps = nights >= 28 ? l.monthly_discount_bps : nights >= 7 ? l.weekly_discount_bps : 0;
  const discount = pgRound(accommodation * discount_bps / 10000);
  const extraGuests = Math.max(0, adults + children - l.base_guests);
  const extra = extraGuests * l.extra_guest_fee_minor * nights;
  const subtotal = accommodation - discount + l.cleaning_fee_minor + extra;
  const guestFee = pgRound(subtotal * fees.guestBps / 10000);
  const commission = pgRound(subtotal * fees.commissionBps / 10000);
  const tax = pgRound((subtotal + guestFee) * fees.taxBps / 10000);
  return {
    nights, nightly, currency: "PKR",
    accommodation_minor: accommodation, discount_bps, discount_minor: discount,
    cleaning_fee_minor: l.cleaning_fee_minor, extra_guest_fee_minor: extra,
    subtotal_minor: subtotal, guest_fee_bps: fees.guestBps, guest_fee_minor: guestFee,
    tax_bps: fees.taxBps, tax_minor: tax, total_minor: subtotal + guestFee + tax,
    host_commission_bps: fees.commissionBps, host_commission_minor: commission, host_payout_minor: subtotal - commission,
    security_deposit_minor: l.security_deposit_minor,
  };
}
