"use client";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";

/** Lets a would-be host estimate monthly earnings after the platform commission (from settings). */
export function EarningsCalculator({ commissionBps }: { commissionBps: number }) {
  const [price, setPrice] = useState(15000);
  const [nights, setNights] = useState(12);
  const target = Math.round(price * nights * (10000 - commissionBps) / 10000);
  const [shown, setShown] = useState(target);
  const raf = useRef(0);
  const current = useRef(target);

  // Count smoothly toward the new figure (instantly for reduced motion).
  useEffect(() => {
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
    const from = current.current, start = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (t: number) => {
      const k = duration ? Math.min(1, (t - start) / duration) : 1;
      current.current = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
      setShown(current.current);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  const range = "w-full cursor-pointer accent-[var(--forest)] h-2";
  return (
    <div className="rounded-[1.5rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <p className="text-sm text-muted">You could earn about</p>
      <p className="num mt-1 text-[clamp(2rem,5vw,3rem)] font-semibold leading-none tracking-tight text-forest" aria-live="polite">
        {formatMoney(shown * 100, "PKR")}
        <span className="ms-2 text-base font-normal text-muted">/ month</span>
      </p>
      <div className="mt-7 space-y-6">
        <label className="block">
          <span className="flex justify-between text-sm"><span>Nightly price</span><span className="num font-medium">{formatMoney(price * 100, "PKR")}</span></span>
          <input type="range" min={3000} max={80000} step={500} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={`${range} mt-2`} />
        </label>
        <label className="block">
          <span className="flex justify-between text-sm"><span>Nights booked per month</span><span className="num font-medium">{nights}</span></span>
          <input type="range" min={1} max={30} value={nights} onChange={(e) => setNights(Number(e.target.value))} className={`${range} mt-2`} />
        </label>
      </div>
      <p className="mt-6 text-xs text-muted">After the {commissionBps / 100}% host commission. Cleaning fees you charge are extra. An estimate, not a guarantee.</p>
    </div>
  );
}
