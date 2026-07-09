/* Where the actual PWA lives. Override per environment on Vercel with
   NEXT_PUBLIC_APP_URL once a custom domain is wired up. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://athonesayate.vercel.app";

export const SITE_NAME = "Athonesayate";
export const SITE_NAME_MY = "အသုံးစရိတ်";
export const SITE_TAGLINE = "Know where every baht goes.";
export const SITE_DESCRIPTION =
  "Athonesayate is a fast, installable expense tracker — log spending in seconds, see budgets and trends at a glance, and get bill reminders before due dates. Works offline as a PWA.";
