"use client";

import { BadgeDollarSign, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Languages, Moon, Sun } from "lucide-react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { currency } from "@athonesayate/shared/metrics";
import type { Language } from "@/lib/i18n";
import type { ValidationResult } from "@/lib/validation";
import type { TabKey } from "./nav";

/** Outline for a control the form is still waiting on. */
export const INVALID_FIELD = "border-coral bg-coral/[0.04]";

/**
 * Spells out, next to the form itself, what an action is still waiting on. The
 * global toast can scroll out of view; this stays where the user is working.
 */
export function FormAlert({
  result,
  show = true,
  onFix,
  className = ""
}: {
  result: ValidationResult;
  /** Field-level requirements only nag once the user has tried to submit. */
  show?: boolean;
  onFix?: (tab: TabKey) => void;
  className?: string;
}) {
  // A prerequisite the form cannot satisfy on its own is worth saying upfront.
  if (result.ok || (!show && !result.fix)) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral ${className}`}
    >
      <CircleAlert size={16} className="shrink-0" />
      <span className="min-w-0">{result.message}</span>
      {result.fix && onFix ? (
        <button
          type="button"
          onClick={() => onFix(result.fix!.tab)}
          className="ml-auto shrink-0 rounded-lg border border-coral/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-coral/10"
        >
          {result.fix.label}
        </button>
      ) : null}
    </div>
  );
}

export function Panel({
  id,
  title,
  action,
  children
}: {
  id?: string;
  title: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="liquid-panel min-w-0 rounded-xl border border-ink/10 bg-white p-3 shadow-soft sm:p-4">
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="min-w-0 text-base font-semibold sm:text-lg">{title}</h2>
        <span className="shrink-0 text-sm text-ink/55">{action}</span>
      </div>
      {children}
    </section>
  );
}

export function DashboardPanel({
  title,
  action,
  children,
  className = ""
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`liquid-panel min-w-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft ${className}`}>
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 text-base font-semibold">{title}</h2>
        {typeof action === "string" || typeof action === "number" ? (
          <span className="shrink-0 rounded-lg border border-ink/10 bg-white/55 px-3 py-1.5 text-xs font-medium text-ink/60">{action}</span>
        ) : action ? (
          <span className="shrink-0">{action}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DashboardMonthControl({
  month,
  onChange
}: {
  month: Date;
  onChange: (month: Date) => void;
}) {
  const changeBy = (offset: number) => onChange(startOfMonth(addMonths(month, offset)));

  return (
    <div className="liquid-control mx-auto grid h-12 w-full max-w-sm grid-cols-[44px_minmax(0,1fr)_44px_44px] items-center rounded-2xl border border-ink/10 bg-white px-1.5 text-sm shadow-soft">
      <button type="button" onClick={() => changeBy(-1)} className="grid size-9 place-items-center rounded-xl text-ink/65 transition hover:bg-river/10 hover:text-river" aria-label="Previous month">
        <ChevronLeft size={18} />
      </button>
      <span className="truncate text-center font-semibold">{format(month, "MMMM yyyy")}</span>
      <button type="button" onClick={() => changeBy(1)} className="grid size-9 place-items-center rounded-xl text-ink/65 transition hover:bg-river/10 hover:text-river" aria-label="Next month">
        <ChevronRight size={18} />
      </button>
      <label className="relative grid size-9 place-items-center rounded-xl border border-ink/10 bg-white/60 text-ink/55 transition hover:bg-river/10 hover:text-river" aria-label="Choose month">
        <CalendarDays size={17} />
        <input
          type="month"
          value={format(month, "yyyy-MM")}
          onChange={(event) => { if (event.target.value) onChange(parseISO(`${event.target.value}-01`)); }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Choose month"
        />
      </label>
    </div>
  );
}

export function ActivityStat({
  label,
  value,
  sub,
  tone,
  compact = false
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "coral" | "moss" | "amber" | "ink" | "river";
  compact?: boolean;
}) {
  const toneClass = {
    amber: "text-amber",
    coral: "text-coral",
    ink: "text-ink",
    moss: "text-moss",
    river: "text-river"
  }[tone];

  return (
    <div className={compact ? "min-w-0" : "liquid-card min-w-0 rounded-lg border border-ink/10 bg-white p-3"}>
      <p className="truncate text-xs uppercase text-ink/45">{label}</p>
      <p className={`break-words font-semibold leading-tight ${compact ? "text-sm" : "text-base"} ${toneClass}`}>{value}</p>
      {sub ? <p className="text-xs text-ink/45">{sub}</p> : null}
    </div>
  );
}

export function MonthField({
  label,
  month,
  onChange
}: {
  label: string;
  month: Date;
  onChange: (month: Date) => void;
}) {
  return (
    <label className="flex w-full flex-col gap-1 text-sm text-ink/55 sm:inline-flex sm:w-auto sm:flex-row sm:items-center sm:gap-2">
      <span className="font-medium">{label}</span>
      <input
        type="month"
        value={format(month, "yyyy-MM")}
        onChange={(event) => { if (event.target.value) onChange(parseISO(`${event.target.value}-01`)); }}
        className="h-9 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink sm:w-auto"
      />
    </label>
  );
}

export function AnimatedNumber({ value, format: formatValue }: { value: number; format: (value: number) => string }) {
  const [display, setDisplay] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const from = previousValue.current;
    previousValue.current = value;

    if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const duration = 750;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className="tnum">{formatValue(display)}</span>;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  format: formatValue = (amount) => currency.format(amount)
}: {
  icon: typeof BadgeDollarSign;
  label: string;
  value: number;
  sub: string;
  tone: "moss" | "river" | "coral";
  format?: (value: number) => string;
}) {
  const tones = {
    moss: { chip: "bg-moss/12 text-moss", wash: "from-moss/[0.08]" },
    river: { chip: "bg-river/12 text-river", wash: "from-river/[0.08]" },
    coral: { chip: "bg-coral/12 text-coral", wash: "from-coral/[0.08]" }
  };

  return (
    <article className="liquid-card relative overflow-hidden rounded-xl border border-ink/10 bg-white p-3 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-4">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tones[tone].wash} to-transparent`} />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className={`grid size-10 place-items-center rounded-xl ${tones[tone].chip}`}>
            <Icon size={20} />
          </span>
          <span className="text-xs font-medium uppercase tracking-normal text-ink/45">{label}</span>
        </div>
        <p className="font-display text-xl font-semibold sm:text-2xl">
          <AnimatedNumber value={value} format={formatValue} />
        </p>
        <p className="mt-1 text-sm text-ink/55">{sub}</p>
      </div>
    </article>
  );
}

export function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="liquid-control grid size-11 shrink-0 place-items-center rounded-xl border border-ink/10 bg-white text-ink/60 transition hover:border-river/30 hover:text-river"
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function LanguageToggle({
  language,
  onChange,
  label
}: {
  language: Language;
  onChange: (language: Language) => void;
  label: string;
}) {
  return (
    <div className="liquid-control inline-flex h-10 items-center gap-1 rounded-lg border border-ink/10 bg-white p-1" aria-label={label}>
      <span className="grid size-8 place-items-center text-ink/50">
        <Languages size={17} />
      </span>
      {(["en", "my"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-pressed={language === item}
          className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
            language === item ? "bg-river text-bright" : "text-ink/55 hover:bg-river/10 hover:text-river"
          }`}
        >
          {item === "en" ? "EN" : "မြန်မာ"}
        </button>
      ))}
    </div>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: "moss" | "river" | "amber" }) {
  const toneClass = {
    moss: "border-moss/20 bg-moss/10 text-moss",
    river: "border-river/20 bg-river/10 text-river",
    amber: "border-amber/20 bg-amber/10 text-amber"
  }[tone];
  return <span className={`liquid-control rounded-lg border px-3 py-2 text-sm font-semibold ${toneClass}`}>{label}</span>;
}

export function DashboardSkeleton() {
  return (
    <div className="grid animate-fade-in gap-4" aria-hidden>
      <div className="flex justify-end">
        <div className="skeleton h-9 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="liquid-card rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="skeleton size-10" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton mb-2 h-7 w-32" />
            <div className="skeleton h-4 w-40" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 2xl:grid-cols-[1.55fr_1fr]">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="liquid-card rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
            <div className="skeleton mb-4 h-5 w-40" />
            <div className="skeleton h-56 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="liquid-card rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
            <div className="skeleton mb-4 h-5 w-48" />
            <div className="skeleton h-72 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabSkeleton() {
  return (
    <div className="grid animate-fade-in gap-4" aria-hidden>
      <div className="liquid-panel rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
        <div className="skeleton mb-4 h-5 w-48" />
        <div className="skeleton mb-3 h-10 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    </div>
  );
}
