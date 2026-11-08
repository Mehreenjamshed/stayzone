"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** On the homepage the header floats transparently over the hero, then turns solid on scroll. */
export function HeaderShell({ children, banner }: { children: ReactNode; banner?: ReactNode }) {
  const overlay = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const clear = overlay && !scrolled;
  return (
    <header data-clear={clear || undefined}
      className={cn("group top-0 z-40 w-full transition-[background-color,box-shadow,border-color] duration-300",
        overlay ? "fixed" : "sticky",
        clear ? "border-b border-transparent bg-transparent text-white"
              : "border-b border-line/80 bg-ivory/85 backdrop-blur-md shadow-[0_1px_0_rgb(0_0_0/0.02)]")}>
      {banner}
      {children}
    </header>
  );
}
