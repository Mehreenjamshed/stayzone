import Link from "next/link";
import { Logo } from "./logo";
import { PreferencesForm } from "./preferences-form";
import { brand } from "@/config/brand";
import { getDictionary, getDisplayCurrency } from "@/lib/i18n/server";

export async function SiteFooter() {
  const [{ t, locale }, currency] = await Promise.all([getDictionary(), getDisplayCurrency()]);
  const f = t.footer;
  const cols = [
    { title: f.company, links: [["/about", f.about], ["/how-it-works", f.howItWorks], ["/contact", f.contact]] },
    { title: f.guests, links: [["/help", f.help], ["/explore", t.nav.explore], ["/cancellation-policy", f.cancellation]] },
    { title: f.hosts, links: [["/become-a-host", t.nav.becomeHost], ["/help#hosting", f.hostResources.replace("{brand}", brand.name)]] },
    { title: f.policies, links: [["/terms", f.terms], ["/privacy", f.privacy], ["/cancellation-policy", f.cancellation]] },
  ];
  const socials = Object.entries(brand.social).filter(([, url]) => url);
  return (
    <footer className="mt-24 bg-forest-deep text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <Logo tone="light" />
          <p className="mt-4 text-sm text-ivory/70">{locale === "ur" ? brand.taglineUr : brand.tagline}</p>
          <p className="mt-4 text-sm text-ivory/70"><a className="underline-offset-4 hover:underline" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a></p>
          {socials.length > 0 && (
            <ul className="mt-4 flex gap-4 text-sm">{socials.map(([k, url]) => <li key={k}><a className="capitalize text-ivory/80 hover:text-white" href={url} rel="noopener noreferrer" target="_blank">{k}</a></li>)}</ul>
          )}
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-sm font-semibold text-gold">{c.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {c.links.map(([href, label]) => <li key={href + label}><Link href={href} className="text-sm text-ivory/80 hover:text-white">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-ivory/60 sm:px-6">
          <p>© {new Date().getFullYear()} {brand.name}. {f.rights}</p>
          <div className="text-ivory [&_select]:text-ivory [&_option]:text-charcoal [&_svg]:text-ivory/60">
            <PreferencesForm locale={locale} currency={currency} labels={{ language: t.common.language, currency: t.common.currency }} />
          </div>
        </div>
      </div>
    </footer>
  );
}
