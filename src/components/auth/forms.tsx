"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Alert, Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/(auth)/actions";
import type { FormState } from "@/app/(auth)/schemas";

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pe-11" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center text-muted hover:text-charcoal">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
const err = (s: FormState, k: string) => s.errors?.[k];
const aria = (s: FormState, k: string) => ({ "aria-invalid": !!err(s, k) || undefined, "aria-describedby": err(s, k) ? `${k}-error` : undefined });

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Email" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} {...aria(state, "email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={err(state, "password")}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required {...aria(state, "password")} />
      </Field>
      <div className="flex justify-end"><Link href="/forgot-password" className="text-sm text-forest hover:underline">Forgot password?</Link></div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Logging in…" : "Log in"}</Button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUp, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="next" value={next ?? "/account"} />
      <Field label="Full name" htmlFor="fullName" error={err(state, "fullName")}>
        <Input id="fullName" name="fullName" autoComplete="name" required defaultValue={state.values?.fullName} {...aria(state, "fullName")} />
      </Field>
      <Field label="Email" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} {...aria(state, "email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={err(state, "password")} hint="At least 10 characters, with a letter and a number.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required {...aria(state, "password")} />
      </Field>
      <div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 accent-[var(--forest)]" {...aria(state, "terms")} />
          <span>I agree to the <Link className="text-forest underline" href="/terms" target="_blank">Terms</Link> and <Link className="text-forest underline" href="/privacy" target="_blank">Privacy Policy</Link>.</span>
        </label>
        {err(state, "terms") && <p id="terms-error" className="mt-1.5 text-sm text-danger">{err(state, "terms")}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Email" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required {...aria(state, "email")} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="New password" htmlFor="password" error={err(state, "password")} hint="At least 10 characters, with a letter and a number.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required {...aria(state, "password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={err(state, "confirm")}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required {...aria(state, "confirm")} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
