"use client";

import { useLang } from "./lang-context";

/* Compact segmented control: EN | မြ. Matches the height/glass treatment of
   the theme toggle beside it. */
export function LangToggle() {
  const { locale, setLocale } = useLang();

  return (
    <div
      role="group"
      aria-label="Language"
      className="liquid-control flex h-10 items-center rounded-full border p-1 text-xs font-semibold"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-2.5 py-1.5 transition ${
          locale === "en" ? "bg-river text-bright shadow-glow" : "text-ink/55 hover:text-ink"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        lang="my"
        onClick={() => setLocale("my")}
        aria-pressed={locale === "my"}
        className={`rounded-full px-2.5 py-1.5 transition ${
          locale === "my" ? "bg-river text-bright shadow-glow" : "text-ink/55 hover:text-ink"
        }`}
      >
        မြန်မာ
      </button>
    </div>
  );
}
