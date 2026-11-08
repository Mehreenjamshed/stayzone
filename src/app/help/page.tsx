import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/content/prose-page";
export const metadata: Metadata = { title: "Help centre" };
const faq = [
  ["When is my booking confirmed?", "When the payment provider confirms your payment. A browser screen alone never confirms a booking."],
  ["Which currency am I charged in?", "Pakistani rupees (PKR). Other currencies are shown for reference only."],
  ["Can I pay the host directly?", "Please don’t. Payments outside the platform aren’t protected and may be a scam."],
  ["What ID do I need at check-in?", "An original CNIC for Pakistani citizens, or a passport for international guests. Some hosts must register guests with local authorities."],
  ["How do I cancel?", "Open the trip in Your trips. Refunds follow the listing’s cancellation policy."],
];
export default function Help() {
  return (
    <ProsePage title="Help centre" intro={`Can’t find an answer? Email ${brand.supportEmail}.`}>
      {faq.map(([q, a]) => <section key={q}><h2 className="!text-lg">{q}</h2><p className="text-muted">{a}</p></section>)}
      <h2 id="hosting">For hosts</h2>
      <p>Start from <a href="/become-a-host">Become a host</a>. Your listing goes live after our team reviews your property details and documents.</p>
    </ProsePage>
  );
}
