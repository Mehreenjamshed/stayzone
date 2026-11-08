"use client";
import { useActionState } from "react";
import { activateHost } from "./actions";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { HostProfile } from "@/types/db";

const LANGS = [["en", "English"], ["ur", "Urdu"], ["pa", "Punjabi"], ["ps", "Pashto"], ["sd", "Sindhi"], ["bal", "Balochi"], ["ar", "Arabic"]];

export function HostForm({ initial, defaultName }: { initial: HostProfile | null; defaultName: string }) {
  const [state, action, pending] = useActionState(activateHost, {});
  const e = (k: string) => state.errors?.[k];
  const langs = initial?.languages ?? ["en", "ur"];
  return (
    <form action={action} className="space-y-5">
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Name shown to guests" htmlFor="display_name" error={e("display_name")}><Input id="display_name" name="display_name" defaultValue={initial?.display_name ?? defaultName} /></Field>
      <Field label="You are hosting as" htmlFor="host_type"><Select id="host_type" name="host_type" defaultValue={initial?.host_type ?? "INDIVIDUAL"}>
        <option value="INDIVIDUAL">An individual owner</option><option value="PROPERTY_MANAGER">A property manager</option>
        <option value="HOTEL">A hotel or guest house</option><option value="COMPANY">A registered company</option></Select></Field>
      <Field label="Business name (optional)" htmlFor="business_name"><Input id="business_name" name="business_name" defaultValue={initial?.business_name ?? ""} /></Field>
      <Field label="About you" htmlFor="about" error={e("about")} hint="What do you love about hosting? What’s nearby?"><Textarea id="about" name="about" maxLength={2000} defaultValue={initial?.about ?? ""} /></Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Languages you speak</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {LANGS.map(([v, l]) => <label key={v} className="flex items-center gap-2"><input type="checkbox" name="languages" value={v} defaultChecked={langs.includes(v)} className="h-4 w-4 accent-[var(--forest)]" />{l}</label>)}
        </div>
        {e("languages") && <p className="mt-1.5 text-sm text-danger">{e("languages")}</p>}
      </fieldset>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial ? "Save host profile" : "Continue"}</Button>
    </form>
  );
}
