"use client";
import { useActionState } from "react";
import { updateProfile } from "./actions";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { DISPLAY_CURRENCIES } from "@/lib/money";
import type { Profile } from "@/types/db";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const e = (k: string) => state.errors?.[k];
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      {state.ok && <div className="sm:col-span-2"><Alert tone="success">Profile saved.</Alert></div>}
      {state.message && <div className="sm:col-span-2"><Alert tone="error">{state.message}</Alert></div>}
      <Field label="Full name" htmlFor="full_name" error={e("full_name")}><Input id="full_name" name="full_name" defaultValue={profile.full_name} autoComplete="name" /></Field>
      <Field label="Phone" htmlFor="phone" error={e("phone")} hint="Shared with your host only after a booking is confirmed."><Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" placeholder="+92 300 1234567" /></Field>
      <Field label="Country (2-letter code)" htmlFor="country" error={e("country")}><Input id="country" name="country" maxLength={2} defaultValue={profile.country ?? ""} placeholder="PK" className="uppercase" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Language" htmlFor="preferred_language"><Select id="preferred_language" name="preferred_language" defaultValue={profile.preferred_language}><option value="en">English</option><option value="ur">اردو</option></Select></Field>
        <Field label="Currency" htmlFor="preferred_currency"><Select id="preferred_currency" name="preferred_currency" defaultValue={profile.preferred_currency}>{DISPLAY_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      </div>
      <div className="sm:col-span-2"><Field label="About you" htmlFor="bio" error={e("bio")} hint="Helps hosts get to know you."><Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={1000} /></Field></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
    </form>
  );
}
