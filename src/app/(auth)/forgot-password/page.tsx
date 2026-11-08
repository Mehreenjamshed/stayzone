import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we'll send you a link to choose a new password."
      footer={<Link className="text-forest underline" href="/login">Back to log in</Link>}>
      <ForgotForm />
    </AuthShell>
  );
}
