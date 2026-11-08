import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";

const NAV = [["/account", "Profile"], ["/account/bookings", "Trips"], ["/account/favorites", "Saved"]] as const;

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Account" className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4">
        {NAV.map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-forest/50">{label}</Link>)}
      </nav>
      {children}
    </div>
  );
}
