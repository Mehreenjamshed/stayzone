import { brand } from "@/config/brand";
export default function Suspended() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Your account is suspended</h1>
      <p className="mt-3 text-muted">You can’t book or host while your account is under review. Email <a className="text-forest underline" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> and we’ll help you sort it out.</p>
    </div>
  );
}
