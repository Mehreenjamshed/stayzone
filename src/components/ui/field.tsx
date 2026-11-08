import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-[var(--radius-control)] border border-line bg-white px-3.5 text-[15px] text-charcoal placeholder:text-muted/70 transition-colors focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-2.5", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11 appearance-none bg-[length:12px] bg-no-repeat pe-9 [background-position:right_14px_center] rtl:[background-position:left_14px_center]", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23222622' stroke-width='1.6' fill='none'/%3E%3C/svg%3E\")" }} {...props} />;
}
export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-charcoal", className)} {...props} />;
}
export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-danger">{error}</p> : hint ? <p className="mt-1.5 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const tones = {
    info: "bg-forest-tint text-forest-deep border-forest/15",
    success: "bg-forest-tint text-forest-deep border-forest/25",
    error: "bg-danger-tint text-danger border-danger/20",
    warning: "bg-sand/70 text-charcoal border-gold/50",
  };
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}
