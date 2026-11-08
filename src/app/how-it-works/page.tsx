import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";
export const metadata: Metadata = { title: "How it works" };
const guest = [
  ["Search", "Choose a destination, dates and number of guests. Only places available for your dates are shown."],
  ["Check the full price", "Pick your dates on a listing to see every charge — nightly rate, cleaning, service fee — before you commit."],
  ["Reserve", "Instant-book places hold your dates while you pay. For request-to-book places, the host has 24 hours to accept."],
  ["Pay securely", "Your booking is confirmed only after the payment provider confirms your payment."],
  ["Stay and review", "After checkout, you can leave a review. Only guests who actually stayed can review."],
];
export default function HowItWorks() {
  return (
    <ProsePage title="How it works" intro="Booking a stay takes five steps.">
      <ol className="space-y-6">
        {guest.map(([h, b], i) => (
          <li key={h} className="flex gap-4"><span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm text-white">{i + 1}</span><div><h2 className="!mt-0 !text-lg">{h}</h2><p className="text-muted">{b}</p></div></li>
        ))}
      </ol>
    </ProsePage>
  );
}
