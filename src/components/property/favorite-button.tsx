"use client";
import { useOptimistic, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/app/actions/favorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({ propertyId, initialSaved, signedIn, labels, className }: {
  propertyId: string; initialSaved: boolean; signedIn: boolean; labels: { save: string; saved: string }; className?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const [, start] = useTransition();
  const [saved, setSaved] = useOptimistic(initialSaved);
  return (
    <button type="button" aria-pressed={saved} aria-label={saved ? labels.saved : labels.save}
      className={cn("relative z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105", className)}
      onClick={() => {
        if (!signedIn) return router.push(`/login?next=${encodeURIComponent(path)}`);
        start(async () => { setSaved(!saved); await toggleFavorite(propertyId); });
      }}>
      <Heart className={cn("h-[18px] w-[18px]", saved ? "fill-danger text-danger" : "text-charcoal")} aria-hidden />
    </button>
  );
}
