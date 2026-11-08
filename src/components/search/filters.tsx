import { SlidersHorizontal } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { CATEGORIES, FILTER_AMENITIES, SORTS, type SearchParams } from "@/lib/search-params";
import { Input, Select } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";

const AMENITY_LABEL: Record<string, string> = {
  wifi: "Wi-Fi", air_conditioning: "Air conditioning", heating: "Heating", parking: "Parking", kitchen: "Kitchen",
  pool: "Swimming pool", generator: "Generator / UPS", breakfast: "Breakfast", family_friendly: "Family-friendly", pet_friendly: "Pet-friendly",
};

/** Plain GET form: filters live in the URL, so Back/Forward and sharing preserve them. */
export function Filters({ p, t, action, lockedCategory }: { p: SearchParams; t: Dictionary; action: string; lockedCategory?: string }) {
  const hidden = { q: p.q, where: p.where, checkin: p.checkin, checkout: p.checkout, adults: p.adults, children: p.children, infants: p.infants };
  const check = "h-4 w-4 accent-[var(--forest)]";
  return (
    <details className="group rounded-2xl border border-line bg-white lg:open:border-line [&_summary::-webkit-details-marker]:hidden" open>
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-medium lg:pointer-events-none">
        <SlidersHorizontal className="h-4 w-4" aria-hidden /> {t.search.filters}
      </summary>
      <form action={action} className="space-y-6 border-t border-line px-4 py-5">
        {Object.entries(hidden).map(([k, v]) => v != null && v !== "" && <input key={k} type="hidden" name={k} value={String(v)} />)}
        <div>
          <label htmlFor="f-sort" className="mb-1.5 block text-sm font-medium">{t.search.sort}</label>
          <Select id="f-sort" name="sort" defaultValue={p.sort}>{SORTS.map((s) => <option key={s} value={s}>{t.sort[s]}</option>)}</Select>
        </div>
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="mb-1.5 text-sm font-medium">PKR / night</legend>
          <div><label htmlFor="f-min" className="sr-only">{t.search.minPrice}</label><Input id="f-min" name="min" inputMode="numeric" placeholder="Min" defaultValue={p.min} /></div>
          <div><label htmlFor="f-max" className="sr-only">{t.search.maxPrice}</label><Input id="f-max" name="max" inputMode="numeric" placeholder="Max" defaultValue={p.max} /></div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t.search.category}</legend>
          <div className="space-y-2 text-[15px]">
            {(["ENTIRE_PLACE", "PRIVATE_ROOM", "SHARED_ROOM"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2.5"><input type="checkbox" name="space" value={s} defaultChecked={p.space.includes(s)} className={check} />
                {s === "ENTIRE_PLACE" ? "Entire place" : s === "PRIVATE_ROOM" ? "Private room" : "Shared room"}</label>
            ))}
          </div>
        </fieldset>
        {lockedCategory ? <input type="hidden" name="type" value={lockedCategory} /> : (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Property type</legend>
            <div className="grid grid-cols-1 gap-2 text-[15px]">
              {CATEGORIES.map((c) => (
                <label key={c} className="flex items-center gap-2.5"><input type="checkbox" name="type" value={c} defaultChecked={p.type.includes(c)} className={check} />{t.categories[c]}</label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="f-beds" className="mb-1.5 block text-sm font-medium">{t.search.bedrooms}</label>
            <Select id="f-beds" name="beds" defaultValue={p.beds ?? ""}><option value="">{t.search.any}</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}</Select></div>
          <div><label htmlFor="f-baths" className="mb-1.5 block text-sm font-medium">{t.search.bathrooms}</label>
            <Select id="f-baths" name="baths" defaultValue={p.baths ?? ""}><option value="">{t.search.any}</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}</Select></div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t.search.amenities}</legend>
          <div className="space-y-2 text-[15px]">
            {FILTER_AMENITIES.map((a) => (
              <label key={a} className="flex items-center gap-2.5"><input type="checkbox" name="amenity" value={a} defaultChecked={p.amenity.includes(a)} className={check} />{AMENITY_LABEL[a]}</label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="f-rating" className="mb-1.5 block text-sm font-medium">{t.search.rating}</label>
          <Select id="f-rating" name="rating" defaultValue={p.rating ?? ""}><option value="">{t.search.any}</option><option value="4">4.0+</option><option value="4.5">4.5+</option><option value="4.8">4.8+</option></Select>
        </div>
        <div className="space-y-2 text-[15px]">
          <label className="flex items-center gap-2.5"><input type="checkbox" name="instant" value="1" defaultChecked={p.instant} className={check} />{t.search.instant}</label>
          <label className="flex items-center gap-2.5"><input type="checkbox" name="verified" value="1" defaultChecked={p.verified} className={check} />{t.search.verified}</label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">{t.search.apply}</Button>
          <ButtonLink href={action} variant="outline">{t.search.clear}</ButtonLink>
        </div>
      </form>
    </details>
  );
}
