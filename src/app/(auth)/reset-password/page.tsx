import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/forms";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The emailed link signs the user in via /auth/confirm, then lands here.
  if (!(await getSessionUser())) redirect("/forgot-password");
  return (
    <AuthShell title="Choose a new password">
      <ResetForm />
    </AuthShell>
  );
}
