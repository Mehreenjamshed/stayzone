"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type Slide = { photo: string; place: string; region: string; elevation: number; alt: string };

const SLIDE_MS = 6500;

/** Cross-fading landscapes with a slow zoom. Pauses when the tab is hidden; static for reduced motion. */
export function HeroSlideshow({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    const vis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => { mq.removeEventListener("change", update); document.removeEventListener("visibilitychange", vis); };
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const id = setTimeout(() => setI((n) => (n + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [i, paused, reduced, slides.length]);

  const s = slides[i];
  return (
    <>
      <div className="absolute inset-0 -z-20 overflow-hidden bg-forest-deep" aria-hidden>
        {slides.map((sl, n) => (
          <div key={sl.photo} className={cn("absolute inset-0 transition-opacity duration-[1600ms] ease-out", n === i ? "opacity-100" : "opacity-0")}>
            <Image src={sl.photo} alt="" fill priority={n === 0} sizes="100vw"
              className={cn("object-cover", !reduced && n === i && "animate-[kenburns_9s_ease-out_forwards]")} />
          </div>
        ))}
      </div>
      {/* Caption + slide controls */}
      <div className="absolute inset-x-0 bottom-0 z-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-4 pb-6 sm:px-6">
          <p key={s.place} className="flex shrink-0 whitespace-nowrap animate-[fadeup_0.8s_ease-out_both] items-center gap-2 text-sm text-white/90" aria-live="polite">
            <MapPin className="h-4 w-4 text-gold" aria-hidden />
            <span className="font-medium">{s.place}</span>
            <span className="hidden text-white/60 sm:inline">{s.region}</span>
            <span className="num text-white/60">{s.elevation.toLocaleString("en")} m</span>
            <span className="sr-only">{s.alt}</span>
          </p>
          <div className="flex gap-1.5" role="group" aria-label="Choose a landscape">
            {slides.map((sl, n) => (
              <button key={sl.photo} onClick={() => setI(n)} aria-label={`Show ${sl.place}`} aria-current={n === i}
                className="group relative h-6 w-6 sm:w-12">
                <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/30">
                  <span key={`${n}-${i}`} className={cn("block h-full rounded-full bg-white",
                    n < i ? "w-full" : n > i ? "w-0" : reduced || paused ? "w-full" : "w-0 animate-[progress_linear_forwards]")}
                    style={n === i && !reduced && !paused ? { animationDuration: `${SLIDE_MS}ms` } : undefined} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
