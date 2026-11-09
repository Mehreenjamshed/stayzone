import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { GuestWaitlistForm } from "@/components/waitlist/forms";

export const metadata: Metadata = { title: "Join the launch list", description: `Be first to book when ${brand.name} opens across Pakistan.` };

export default function WaitlistPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold">Be first to book when we open</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        {brand.name} is onboarding verified hosts across Pakistan, from Hunza to Karachi. Join the list and we’ll email you when bookings open, with early access to the best stays.
      </p>
      <div className="mt-10 rounded-[1.5rem] border border-line bg-white p-6 sm:p-8"><GuestWaitlistForm source="waitlist-page" /></div>
      <p className="mt-8 text-muted">Own a home, hotel or guest house? <Link href="/become-a-host#list" className="text-forest underline">Register your property</Link></p>
    </div>
  );
}
