"use client";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { setPreferences } from "@/app/actions/preferences";
import { DISPLAY_CURRENCIES } from "@/lib/money";
import { cn } from "@/lib/utils";

export function PreferencesForm({ locale, currency, labels, className }: {
  locale: string; currency: string; labels: { language: string; currency: string }; className?: string;
}) {
  const [pending, start] = useTransition();
  const submit = (name: string, value: string) => {
    const fd = new FormData();
    fd.set(name, value);
    start(() => setPreferences(fd));
  };
  const sel = "h-9 rounded-lg border border-transparent bg-transparent px-2 text-sm font-sans hover:border-line focus:border-forest focus:outline-none cursor-pointer";
  return (
    <div className={cn("flex items-center gap-1", pending && "opacity-60", className)}>
      <Globe className="h-4 w-4 text-muted" aria-hidden />
      <label className="sr-only" htmlFor="pref-locale">{labels.language}</label>
      <select id="pref-locale" className={sel} value={locale} onChange={(e) => submit("locale", e.target.value)}>
        <option value="en">English</option>
        <option value="ur">اردو</option>
      </select>
      <label className="sr-only" htmlFor="pref-currency">{labels.currency}</label>
      <select id="pref-currency" className={sel} value={currency} onChange={(e) => submit("currency", e.target.value)}>
        {DISPLAY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}
