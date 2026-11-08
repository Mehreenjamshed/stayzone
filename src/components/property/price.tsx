import { convertMinor, formatMoney, type DisplayCurrency } from "@/lib/money";

/** Shows the PKR price; when another display currency is chosen, shows an indicative conversion. */
export function Price({ minor, currency, display, rates, locale, className }: {
  minor: number; currency: string; display: DisplayCurrency; rates: Partial<Record<DisplayCurrency, number>>; locale: string; className?: string;
}) {
  const converted = display !== currency ? convertMinor(minor, display, rates) : null;
  return (
    <span className={className}>
      <span className="num font-semibold">{converted != null ? `≈ ${formatMoney(converted, display, locale)}` : formatMoney(minor, currency, locale)}</span>
      {converted != null && <span className="num ms-1 text-xs text-muted">({formatMoney(minor, currency, locale)})</span>}
    </span>
  );
}
