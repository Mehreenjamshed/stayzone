import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/content/prose-page";
export const metadata: Metadata = { title: "Contact" };
export default function Contact() {
  return (
    <ProsePage title="Contact us" intro="We reply in English and Urdu.">
      <p>Email: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a></p>
      <p>For an active booking, include your booking number (shown on the trip page) so we can help faster.</p>
    </ProsePage>
  );
}
