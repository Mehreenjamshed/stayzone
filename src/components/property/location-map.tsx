/**
 * Map abstraction. Uses Mapbox static maps when NEXT_PUBLIC_MAPBOX_TOKEN is set,
 * otherwise an OpenStreetMap embed (no key needed). Swap providers here only.
 */
export function LocationMap({ lat, lng, label, zoom = 13, approximate = false }: { lat: number; lng: number; label: string; zoom?: number; approximate?: boolean }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const d = 0.02 * Math.pow(2, 13 - zoom);
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-sand">
      {token ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="aspect-[4/3] w-full object-cover" alt={`Map of ${label}`}
          src={`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-l+164b3a(${lng},${lat})/${lng},${lat},${zoom}/640x480@2x?access_token=${token}`} />
      ) : (
        <iframe title={`Map of ${label}`} loading="lazy" className="aspect-[4/3] w-full"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d * 0.75},${lng + d},${lat + d * 0.75}&layer=mapnik${approximate ? "" : `&marker=${lat},${lng}`}`} />
      )}
      {approximate && <figcaption className="px-4 py-2.5 text-sm text-muted">Approximate area. The exact address is shared after booking.</figcaption>}
    </figure>
  );
}
