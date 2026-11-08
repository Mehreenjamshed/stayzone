import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/content/prose-page";
export const metadata: Metadata = { title: "Terms of service" };
export default function Terms() {
  return (
    <ProsePage draft title="Terms of service">
      <p>{brand.name} is an online marketplace that connects guests with hosts offering accommodation in Pakistan. Hosts, not {brand.name}, provide the accommodation and are responsible for it.</p>
      <h2>Accounts</h2><p>You must give accurate information, keep your password secure and be at least 18 years old to book or host.</p>
      <h2>Bookings and payments</h2><p>Prices are calculated by our system and shown before you book. A booking is confirmed only when payment is verified by our payment provider. Guests are charged in PKR.</p>
      <h2>Hosts</h2><p>Hosts must have the right to offer their property, provide accurate listings, follow local laws including guest registration where required, and honour confirmed bookings.</p>
      <h2>Prohibited conduct</h2><p>No fraud, discrimination, off-platform payment requests, fake reviews or unsafe properties. We may suspend accounts that break these rules.</p>
      <h2>Governing law</h2><p>These terms are governed by the laws of Pakistan.</p>
    </ProsePage>
  );
}
