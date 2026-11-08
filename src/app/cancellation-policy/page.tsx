import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";
export const metadata: Metadata = { title: "Cancellation policy" };
export default function Cancellation() {
  return (
    <ProsePage draft title="Cancellation policy" intro="Each listing shows one of these policies. The policy shown when you booked is the one that applies.">
      <h2>Flexible</h2><p>Full refund of the accommodation cost if you cancel at least 24 hours before check-in.</p>
      <h2>Moderate</h2><p>Full refund up to 5 days before check-in. After that, the first night is non-refundable.</p>
      <h2>Strict</h2><p>50% refund up to 7 days before check-in. No refund after that.</p>
      <h2>Non-refundable</h2><p>No refund after booking, except where required by law or in cases our team decides are exceptional.</p>
      <h2>Unpaid reservations</h2><p>A reservation that hasn’t been paid can be cancelled at any time at no cost.</p>
      <h2>Service fee</h2><p>The guest service fee is refunded when the accommodation cost is refunded in full.</p>
    </ProsePage>
  );
}
