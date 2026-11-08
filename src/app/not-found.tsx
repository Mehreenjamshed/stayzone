import { ButtonLink } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">We couldn’t find that page</h1>
      <p className="mt-3 text-muted">The link may be old, or the stay is no longer listed.</p>
      <ButtonLink href="/search" className="mt-6">Browse stays</ButtonLink>
    </div>
  );
}
