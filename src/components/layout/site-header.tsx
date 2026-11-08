import Link from "next/link";
import { Logo } from "./logo";
import { PreferencesForm } from "./preferences-form";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { getDictionary, getDisplayCurrency } from "@/lib/i18n/server";
import { getProfile } from "@/lib/auth/dal";
import { ButtonLink } from "@/components/ui/button";

export async function SiteHeader() {
  const [{ t, locale }, currency, profile] = await Promise.all([getDictionary(), getDisplayCurrency(), getProfile()]);
  const links = [
    { href: "/search", label: t.nav.explore },
    { href: "/#categories", label: t.nav.categories },
    { href: "/#destinations", label: t.nav.destinations },
    { href: "/become-a-host", label: t.nav.becomeHost },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/90 backdrop-blur supports-[backdrop-filter]:bg-ivory/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-[15px] text-charcoal/80 transition-colors hover:text-forest">{l.label}</Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <PreferencesForm className="hidden md:flex" locale={locale} currency={currency} labels={{ language: t.common.language, currency: t.common.currency }} />
          {profile ? (
            <UserMenu name={profile.full_name || profile.email || ""} isHost={profile.is_host} isAdmin={profile.is_admin} labels={t.nav} />
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <ButtonLink href="/login" variant="ghost" size="sm">{t.nav.login}</ButtonLink>
              <ButtonLink href="/register" size="sm">{t.nav.signup}</ButtonLink>
            </div>
          )}
          <MobileNav
            links={links}
            signedIn={!!profile}
            labels={t.nav}
            prefs={<PreferencesForm locale={locale} currency={currency} labels={{ language: t.common.language, currency: t.common.currency }} />}
          />
        </div>
      </div>
    </header>
  );
}
