import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthShell title="Check your email">
      <MailCheck className="h-10 w-10 text-forest" aria-hidden />
      <p className="mt-4 text-muted">
        We sent a verification link{email ? <> to <strong className="text-charcoal">{email}</strong></> : null}. Open it to activate your account. It can take a minute to arrive — check your spam folder too.
      </p>
    </AuthShell>
  );
}
