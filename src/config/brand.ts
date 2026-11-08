/**
 * Brand configuration. Change the name/tagline here (or via env) without
 * touching the rest of the app.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "StayZone",
  nameUr: process.env.NEXT_PUBLIC_BRAND_NAME_UR || "اسٹے زون",
  tagline: "Your Journey. Your Stay. Your Pakistan.",
  taglineUr: "آپ کا سفر۔ آپ کا قیام۔ آپ کا پاکستان۔",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com",
  social: {
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "",
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "",
    tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK || "",
  },
} as const;
