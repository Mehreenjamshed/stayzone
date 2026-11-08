/** Maps booking-engine error codes (raised in SQL) to guest-facing messages. */
export function bookingErrorMessage(raw: string | undefined): string {
  const code = (raw ?? "").split(":")[0];
  const n = (raw ?? "").split(":")[1];
  const map: Record<string, string> = {
    DATES_REQUIRED: "Choose check-in and check-out dates.",
    CHECKOUT_BEFORE_CHECKIN: "Check-out must be after check-in.",
    CHECKIN_IN_PAST: "Check-in can't be in the past.",
    CHECKIN_TOO_FAR: "That date is too far ahead. Choose a closer date.",
    INVALID_GUESTS: "Add at least one adult.",
    TOO_MANY_GUESTS: "That's more guests than this place allows. Reduce the number of guests or choose a larger room.",
    CHILDREN_NOT_ALLOWED: "This place isn't suitable for children.",
    INFANTS_NOT_ALLOWED: "This place isn't suitable for infants.",
    MIN_NIGHTS: `This stay needs at least ${n} nights for these dates.`,
    MAX_NIGHTS: `Stays here can be at most ${n} nights.`,
    LISTING_NOT_FOUND: "This room is no longer available.",
    PROPERTY_NOT_BOOKABLE: "This place isn't taking bookings right now.",
    DATES_UNAVAILABLE: "Those dates were just taken. Try different dates or another room.",
    CANNOT_BOOK_OWN_PROPERTY: "You can't book your own property.",
    EMAIL_NOT_VERIFIED: "Verify your email before booking — check your inbox for the link.",
    ACCOUNT_SUSPENDED: "Your account is suspended. Contact support for help.",
    TOO_MANY_OPEN_HOLDS: "You have several unfinished reservations. Complete or cancel one before starting another.",
    DEMO_LISTING: "This is a demo listing and can't be booked.",
    AUTH_REQUIRED: "Log in to reserve.",
  };
  return map[code] ?? "We couldn't complete that. Check the details and try again.";
}
