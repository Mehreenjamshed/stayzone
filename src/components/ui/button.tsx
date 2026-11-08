import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-forest text-white hover:bg-forest-deep",
        secondary: "bg-sand text-charcoal hover:bg-sand-deep",
        outline: "border border-charcoal/20 bg-white text-charcoal hover:border-charcoal/50",
        ghost: "text-charcoal hover:bg-sand/60",
        danger: "bg-danger text-white hover:opacity-90",
        link: "text-forest underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-9 px-3.5 text-sm rounded-[10px]",
        md: "h-11 px-5 text-[15px] rounded-[var(--radius-control)]",
        lg: "h-13 px-7 text-base rounded-[14px]",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ComponentProps<"button"> & Variants) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
