import Link from "next/link";
import { Logo } from "./logo";
import { PreferencesForm } from "./preferences-form";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { getDictionary, getDisplayCurrency } from "@/lib/i18n/server";
import { getProfile } from "@/lib/auth/dal";
import { ButtonLink } from "@/components/ui/button";
import { HeaderShell } from "./header-shell";
import { isConfigured, isDemoMode, isWaitlistPhase } from "@/config/env";

export async function SiteHeader() {
  const [{ t, locale }, currency, profile] = await Promise.all([getDictionary(), getDisplayCurrency(), getProfile()]);
  const links = [
    { href: "/search", label: t.nav.explore },
    { href: "/#categories", label: t.nav.categories },
    { href: "/#destinations", label: t.nav.destinations },
    { href: "/become-a-host", label: t.nav.becomeHost },
  ];
  return (
    <HeaderShell banner={<>
      {!isConfigured() && !isDemoMode() && (
        <div className="bg-sand px-4 py-2 text-center text-sm text-charcoal">
          Setup needed: add your Supabase keys to <code>.env.local</code> (see README, step 3). Data and sign-in are disabled until then.
        </div>
      )}
      {isWaitlistPhase() ? (
        <div className="bg-charcoal/90 px-4 py-1.5 text-center text-[13px] text-ivory/90">
          Launching soon. Stays marked “Demo listing” are examples that show how booking will work.{" "}
          <a href="/waitlist" className="font-medium text-gold underline-offset-2 hover:underline">Join the launch list</a>
        </div>
      ) : isDemoMode() && (
        <div className="bg-charcoal/90 px-4 py-1.5 text-center text-[13px] text-ivory/90">
          Preview version. Listings marked “Demo listing” are examples with illustrative photos, not real properties, and can’t be booked.
        </div>
      )}
    </>}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap text-[15px] text-charcoal/80 transition-colors hover:text-forest group-data-[clear]:text-white/90 group-data-[clear]:hover:text-white">{l.label}</Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <PreferencesForm className="hidden xl:flex group-data-[clear]:[&_select]:text-white group-data-[clear]:[&_option]:text-charcoal group-data-[clear]:[&_svg]:text-white/70" locale={locale} currency={currency} labels={{ language: t.common.language, currency: t.common.currency }} />
          {profile ? (
            <UserMenu name={profile.full_name || profile.email || ""} isHost={profile.is_host} isAdmin={profile.is_admin} labels={t.nav} />
          ) : isWaitlistPhase() ? (
            <div className="hidden items-center gap-1 sm:flex">
              <ButtonLink href="/waitlist" variant="ghost" size="sm" className="group-data-[clear]:text-white group-data-[clear]:hover:bg-white/15">Join the launch list</ButtonLink>
              <ButtonLink href="/become-a-host#list" size="sm" className="group-data-[clear]:bg-white group-data-[clear]:text-forest group-data-[clear]:hover:bg-ivory">List your property</ButtonLink>
            </div>
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <ButtonLink href="/login" variant="ghost" size="sm" className="group-data-[clear]:text-white group-data-[clear]:hover:bg-white/15">{t.nav.login}</ButtonLink>
              <ButtonLink href="/register" size="sm" className="group-data-[clear]:bg-white group-data-[clear]:text-forest group-data-[clear]:hover:bg-ivory">{t.nav.signup}</ButtonLink>
            </div>
          )}
          <MobileNav
            links={links}
            signedIn={!!profile}
            waitlist={isWaitlistPhase()}
            labels={t.nav}
            prefs={<PreferencesForm locale={locale} currency={currency} labels={{ language: t.common.language, currency: t.common.currency }} />}
          />
        </div>
      </div>
    </HeaderShell>
  );
}
