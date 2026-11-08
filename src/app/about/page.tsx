import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/content/prose-page";
export const metadata: Metadata = { title: "About" };
export default function About() {
  return (
    <ProsePage title={`About ${brand.name}`} intro="We make finding and booking a place to stay in Pakistan simple, transparent and safe — for families, travellers and everyone coming home.">
      <p>Pakistan has extraordinary places to stay: haveli guest houses in Lahore, family farmhouses, lakeside hotels in Skardu and timber cabins in the Galyat. Booking them has often meant phone calls, screenshots and advance payments to people you’ve never met.</p>
      <p>{brand.name} brings these stays into one place, with verified hosts, clear prices and a booking process that protects both guests and hosts.</p>
      <h2>What we believe</h2>
      <ul><li>Every fee should be visible before you book.</li><li>Hosts should be verified, not just listed.</li><li>Paying for a stay should work with the wallets and cards people in Pakistan actually use.</li><li>Help should be available in Urdu and English.</li></ul>
    </ProsePage>
  );
}
