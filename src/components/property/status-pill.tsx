import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  PENDING: "Waiting for host", AWAITING_PAYMENT: "Awaiting payment", CONFIRMED: "Confirmed", CHECKED_IN: "Checked in",
  COMPLETED: "Completed", CANCELLED: "Cancelled", REJECTED: "Declined", EXPIRED: "Expired", REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded", DISPUTED: "Under review",
};
const TONE: Record<string, string> = {
  CONFIRMED: "bg-forest-tint text-forest-deep", CHECKED_IN: "bg-forest-tint text-forest-deep", COMPLETED: "bg-sand text-charcoal",
  PENDING: "bg-gold/20 text-gold-deep", AWAITING_PAYMENT: "bg-gold/20 text-gold-deep", DISPUTED: "bg-gold/20 text-gold-deep",
};
export function StatusPill({ status }: { status: string }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", TONE[status] ?? "bg-charcoal/5 text-muted")}>{LABEL[status] ?? status}</span>;
}
