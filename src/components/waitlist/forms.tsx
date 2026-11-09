"use client";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { joinAsGuest, joinAsHost, type WaitlistState } from "@/app/actions/waitlist";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPES: [string, string][] = [
  ["ENTIRE_HOME", "Entire home"], ["APARTMENT", "Apartment"], ["SERVICED_APARTMENT", "Serviced apartment"], ["VILLA", "Villa"],
  ["FARMHOUSE", "Farmhouse"], ["GUEST_HOUSE", "Guest house"], ["HOTEL", "Hotel"], ["RESORT", "Resort"], ["COTTAGE", "Cottage"],
  ["MOUNTAIN_CABIN", "Mountain cabin"], ["PRIVATE_ROOM", "Private room"], ["SHARED_ROOM", "Shared room"], ["HOSTEL", "Hostel"],
];

function Honeypot() {
  return <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>;
}
function Done({ state, who }: { state: WaitlistState; who: "host" | "guest" }) {
  return (
    <div role="status" className="rounded-2xl bg-forest-tint p-6 text-forest-deep">
      <CheckCircle2 className="h-8 w-8" aria-hidden />
      <p className="mt-3 text-lg font-semibold">{state.already ? "You're already on the list." : "You're on the list!"}</p>
      <p className="mt-1">{who === "host"
        ? "We'll contact you personally to set up your listing before we open to guests."
        : "We'll email you when bookings open, with early access to the best stays."}</p>
    </div>
  );
}
const err = (s: WaitlistState, k: string) => s.errors?.[k];
const aria = (s: WaitlistState, k: string) => ({ "aria-invalid": !!err(s, k) || undefined, "aria-describedby": err(s, k) ? `${k}-error` : undefined });

function Consent({ state, text }: { state: WaitlistState; text: string }) {
  return (
    <div>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-[var(--forest)]" {...aria(state, "consent")} />
        <span>{text}</span>
      </label>
      {err(state, "consent") && <p id="consent-error" className="mt-1.5 text-sm text-danger">{err(state, "consent")}</p>}
    </div>
  );
}

export function HostInterestForm({ source = "become-a-host" }: { source?: string }) {
  const [state, action, pending] = useActionState(joinAsHost, {});
  if (state.ok) return <Done state={state} who="host" />;
  return (
    <form action={action} noValidate className="relative grid gap-5 sm:grid-cols-2">
      <Honeypot />
      <input type="hidden" name="source" value={source} />
      {state.message && <div className="sm:col-span-2"><Alert tone="error">{state.message}</Alert></div>}
      <Field label="Your name" htmlFor="h-name" error={err(state, "full_name")}><Input id="h-name" name="full_name" autoComplete="name" {...aria(state, "full_name")} /></Field>
      <Field label="Email" htmlFor="h-email" error={err(state, "email")}><Input id="h-email" name="email" type="email" autoComplete="email" {...aria(state, "email")} /></Field>
      <div>
        <Field label="Phone" htmlFor="h-phone" error={err(state, "phone")}><Input id="h-phone" name="phone" type="tel" autoComplete="tel" placeholder="+92 300 1234567" {...aria(state, "phone")} /></Field>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="whatsapp_ok" defaultChecked className="h-4 w-4 accent-[var(--forest)]" />You can contact me on WhatsApp</label>
      </div>
      <Field label="City or area" htmlFor="h-city" error={err(state, "city")}><Input id="h-city" name="city" placeholder="e.g. Hunza, Gulberg Lahore" {...aria(state, "city")} /></Field>
      <Field label="Property type" htmlFor="h-type" error={err(state, "property_type")}>
        <Select id="h-type" name="property_type" defaultValue="" {...aria(state, "property_type")}>
          <option value="" disabled>Choose one</option>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rooms / units" htmlFor="h-units" error={err(state, "units")}><Input id="h-units" name="units" type="number" min={1} defaultValue={1} {...aria(state, "units")} /></Field>
        <Field label="Price / night (PKR)" htmlFor="h-price" error={err(state, "nightly_price_pkr")}><Input id="h-price" name="nightly_price_pkr" inputMode="numeric" placeholder="Optional" /></Field>
      </div>
      <div className="sm:col-span-2"><Field label="Anything we should know? (optional)" htmlFor="h-msg"><Textarea id="h-msg" name="message" maxLength={1000} className="min-h-20" /></Field></div>
      <div className="sm:col-span-2"><Consent state={state} text="I agree that StayZone can contact me about listing my property. We never share your details." /></div>
      <div className="sm:col-span-2"><Button type="submit" size="lg" disabled={pending}>{pending ? "Sending…" : "Register my property"}</Button></div>
    </form>
  );
}

export function GuestWaitlistForm({ source = "home", tone = "light" }: { source?: string; tone?: "light" | "dark" }) {
  const [state, action, pending] = useActionState(joinAsGuest, {});
  if (state.ok) return <Done state={state} who="guest" />;
  return (
    <form action={action} noValidate className={cn("relative grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start", tone === "dark" && "[&_label]:text-ivory")}>
      <Honeypot />
      <input type="hidden" name="source" value={source} />
      {state.message && <div className="sm:col-span-3"><Alert tone="error">{state.message}</Alert></div>}
      <Field label="Your name" htmlFor="g-name" error={err(state, "full_name")}><Input id="g-name" name="full_name" autoComplete="name" {...aria(state, "full_name")} /></Field>
      <Field label="Email" htmlFor="g-email" error={err(state, "email")}><Input id="g-email" name="email" type="email" autoComplete="email" {...aria(state, "email")} /></Field>
      <Button type="submit" className="sm:mt-[30px]" disabled={pending}>{pending ? "Joining…" : "Join the launch list"}</Button>
      <div className="sm:col-span-3"><Consent state={state} text="Email me when bookings open. Unsubscribe anytime." /></div>
    </form>
  );
}
