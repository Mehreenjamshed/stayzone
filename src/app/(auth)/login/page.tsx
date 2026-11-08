import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/field";
import { getSessionUser } from "@/lib/auth/dal";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const dest = safeNext(next, "/");
  if (await getSessionUser()) redirect(dest);
  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your trips and listings."
      footer={<>New here? <Link className="text-forest underline" href={`/register${next ? `?next=${encodeURIComponent(dest)}` : ""}`}>Create an account</Link></>}>
      {error === "link" && <div className="mb-5"><Alert tone="error">That link is invalid or has expired. Log in, or request a new link.</Alert></div>}
      <LoginForm next={dest} />
    </AuthShell>
  );
}
