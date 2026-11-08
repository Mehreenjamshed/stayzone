import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/content/prose-page";
import { ButtonLink } from "@/components/ui/button";
import { EarningsCalculator } from "@/components/home/earnings-calculator";
import { getIntSetting } from "@/lib/data/catalog";
export const metadata: Metadata = { title: "Become a host" };
export default async function BecomeAHost() {
  const commissionBps = await getIntSetting("fees.host_commission_bps", 800);
  return (
    <ProsePage title="Have a place worth sharing?" intro={`Turn your property into an income opportunity. Welcome guests and grow your hosting business with ${brand.name}.`}>
      <ButtonLink href="/host/onboarding" size="lg">Start hosting</ButtonLink>
      <div className="not-prose pt-4"><EarningsCalculator commissionBps={commissionBps} /></div>
      <h2>Who can host</h2>
      <p>Homeowners, apartment owners, farmhouse and villa owners, hotels, guest houses, resorts, hostels and professional property managers.</p>
      <h2>What it costs</h2>
      <ul><li>Listing is free on the Free Host plan.</li><li>A commission is deducted only when you earn — currently {commissionBps / 100}% of the booking subtotal.</li><li>Host Pro (PKR 2,999/month) adds more listings, advanced analytics and priority support.</li></ul>
      <h2>Verification</h2>
      <p>To protect guests, every host submits identity (CNIC or passport) and proof of ownership or authorisation. Hotels and guest houses also submit their tourism registration where their province requires it. Documents are stored privately and seen only by our review team.</p>
    </ProsePage>
  );
}
