import { z } from "zod";

export const passwordSchema = z.string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});
export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: passwordSchema,
  terms: z.literal(true, { error: "Please accept the terms to continue" }),
});
export const forgotSchema = z.object({ email: z.email("Enter a valid email address").trim().toLowerCase() });
export const resetSchema = z.object({
  password: passwordSchema,
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> };
