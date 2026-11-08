import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { ProfileForm } from "./profile-form";
import { Alert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Your profile" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string; updated?: string }> }) {
  const { user, profile } = await requireUser();
  const sp = await searchParams;
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Your profile</h1>
        <p className="mt-1 text-muted">{user.email} {user.email_confirmed_at ? <span className="text-forest">· verified</span> : <span className="text-danger">· not verified yet</span>}</p>
      </div>
      {sp.welcome && <Alert tone="success">Your email is verified. Welcome aboard!</Alert>}
      {sp.updated === "password" && <Alert tone="success">Your password was updated.</Alert>}
      <ProfileForm profile={profile} />
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="mt-1 text-sm text-muted">Change your password using a secure link sent to your email.</p>
        <Link href="/forgot-password" className="mt-3 inline-block text-forest underline">Change password</Link>
      </section>
      {!profile.is_host && (
        <section className="rounded-2xl bg-sand/70 p-6">
          <h2 className="text-lg font-semibold">Have a place to share?</h2>
          <p className="mt-1 text-sm">Use the same account to host. You can switch between travelling and hosting anytime.</p>
          <Link href="/host/onboarding" className="mt-3 inline-block font-medium text-forest underline">Start hosting</Link>
        </section>
      )}
    </div>
  );
}
