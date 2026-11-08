import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/content/prose-page";
export const metadata: Metadata = { title: "Privacy policy" };
export default function Privacy() {
  return (
    <ProsePage draft title="Privacy policy">
      <p>This policy explains what {brand.name} collects and why.</p>
      <h2>What we collect</h2><ul><li>Account details: name, email, phone.</li><li>Booking details: dates, guests, messages with hosts.</li><li>Host verification documents (CNIC/passport, ownership proof), stored in private storage and visible only to our review team.</li><li>Payment status from our payment providers. We never store card numbers.</li></ul>
      <h2>Who sees what</h2><p>Hosts see a guest’s name and booking details. Contact details are shared only when needed for a confirmed stay.</p>
      <h2>Your choices</h2><p>You can update your profile anytime and ask us to delete your account at {brand.supportEmail}. Some booking and financial records must be kept for legal and tax reasons.</p>
    </ProsePage>
  );
}
