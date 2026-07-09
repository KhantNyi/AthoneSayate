"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { dictionary, LANG_STORAGE_KEY, type Copy, type Locale } from "@/lib/i18n";

interface LangValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Copy;
}

const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // SSR + first client render use "en" so hydration matches; the inline
  // script in layout.tsx has already set <html lang> for correct fonts,
  // and this effect syncs the stored choice right after mount.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored === "my" || stored === "en") setLocaleState(stored);
    } catch {}
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {}
  }, []);

  // Keep the <html lang> attribute in sync when locale changes from storage.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LangContext.Provider value={{ locale, setLocale, t: dictionary[locale] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within <LangProvider>");
  return ctx;
}
