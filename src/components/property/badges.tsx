import { BadgeCheck, FlaskConical, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-gold-deep", className)}>
      <BadgeCheck className="h-4 w-4 text-gold" aria-hidden /> {label}
    </span>
  );
}
export function DemoBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span title={label} className={cn("inline-flex items-center gap-1 rounded-full bg-charcoal/85 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur", className)}>
      <FlaskConical className="h-3 w-3" aria-hidden /> {label}
    </span>
  );
}
export function InstantBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-forest">
      <Zap className="h-3.5 w-3.5" aria-hidden /> {label}
    </span>
  );
}
