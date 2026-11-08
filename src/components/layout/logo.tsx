import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Original mark: an arched doorway (a place to stay) with a path leading in (the journey). */
export function Logo({ tone = "auto" }: { tone?: "auto" | "light" }) {
  const color = tone === "light" ? "text-ivory" : "text-forest group-data-[clear]:text-white";
  return (
    <Link href="/" className={cn("flex items-center gap-2 transition-colors", color)} aria-label={`${brand.name} home`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <path d="M6 29V14a10 10 0 0 1 20 0v15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 29c0-5 4-6 4-11" fill="none" stroke="#C6A46A" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="20" cy="15" r="1.9" fill="#C6A46A" />
      </svg>
      <span className="font-sans text-[21px] font-semibold tracking-[-0.03em]">{brand.name}</span>
    </Link>
  );
}
