"use client";
import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Adds data-in="true" once the element scrolls into view (once).
 * Children with the .reveal class animate in; .reveal-stagger staggers direct children.
 */
export function Reveal({ as: Tag = "div", className, children, threshold = 0.15 }: {
  as?: ElementType; className?: string; children: ReactNode; threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.in = "true";
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.dataset.in = "true"; io.disconnect(); }
    }, { threshold, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return <Tag ref={ref} className={cn("reveal-root", className)}>{children}</Tag>;
}
