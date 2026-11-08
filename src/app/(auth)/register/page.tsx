import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";
import { getSessionUser } from "@/lib/auth/dal";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign up" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSessionUser()) redirect("/account");
  return (
    <AuthShell title="Create your account" subtitle="One account to book stays and to host your own place."
      footer={<>Already have an account? <Link className="text-forest underline" href="/login">Log in</Link></>}>
      <RegisterForm next={safeNext(next, "/account")} />
    </AuthShell>
  );
}
