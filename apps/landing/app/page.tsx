"use client";

import Image from "next/image";
import {
  ArrowRight,
  BellRing,
  ChartLine,
  CloudOff,
  Monitor,
  MonitorSmartphone,
  MoonStar,
  Share,
  Sparkles,
  Target,
  Zap,
  type LucideIcon
} from "lucide-react";
import { Parallax, ScrollWords } from "@/components/motion";
import { useLang } from "@/components/lang-context";
import { LangToggle } from "@/components/lang-toggle";
import {
  DashboardScreen,
  DesktopMockup,
  PhoneFrame,
  ReportsScreen,
  TransactionsScreen
} from "@/components/phone";
import { QuickAddScene } from "@/components/quick-add-scene";
import { Reveal } from "@/components/reveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_URL, SITE_NAME, SITE_NAME_MY } from "@/lib/site";
import appIcon from "./icon.png";

// Visual bits (icons, tones) stay in code; the words come from the dictionary
// and are zipped together by index below.
const featureStyles: { icon: LucideIcon; tone: string }[] = [
  { icon: Zap, tone: "text-amber bg-amber/10" },
  { icon: ChartLine, tone: "text-river bg-river/10" },
  { icon: Target, tone: "text-moss bg-moss/10" },
  { icon: BellRing, tone: "text-coral bg-coral/10" },
  { icon: CloudOff, tone: "text-river bg-river/10" },
  { icon: MoonStar, tone: "text-amber bg-amber/10" }
];

const platformIcons: LucideIcon[] = [Share, MonitorSmartphone, Monitor];

// Notification cards live inside the product mockup, so they stay in English.
const reminders = [
  { title: "Rent due tomorrow", amount: "฿12,000", when: "now" },
  { title: "Netflix renews in 3 days", amount: "฿419", when: "9:00" },
  { title: "Electricity bill due Friday", amount: "฿1,240", when: "yesterday" }
];

function NotificationCard({
  title,
  amount,
  when
}: {
  title: string;
  amount: string;
  when: string;
}) {
  return (
    <div lang="en" className="liquid-panel w-60 border p-3 sm:w-64">
      <div className="flex items-start gap-2.5">
        <Image src={appIcon} alt="" width={26} height={26} className="mt-0.5 rounded-lg" />
        <div className="min-w-0">
          <p className="flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-ink/45">
            {SITE_NAME}
            <span className="normal-case tracking-normal">{when}</span>
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold">{title}</p>
          <p className="tnum text-xs text-ink/60">{amount}</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useLang();

  return (
    <main className="liquid-ui min-h-dvh">
      {/* ---- Header ------------------------------------------------------ */}
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4">
        <div className="liquid-topbar mx-auto flex max-w-5xl items-center justify-between rounded-full py-2 pl-3 pr-2">
          <a href="#top" className="press flex items-center gap-2.5">
            <Image
              src={appIcon}
              alt=""
              width={34}
              height={34}
              className="rounded-[10px] shadow-soft"
              priority
            />
            <span className="font-display text-sm font-bold sm:text-base">{SITE_NAME}</span>
            <span lang="my" className="hidden text-xs text-ink/50 sm:inline">
              {SITE_NAME_MY}
            </span>
          </a>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <a
              href={APP_URL}
              className="press hidden items-center gap-1.5 rounded-full bg-river px-4 py-2 text-sm font-semibold text-bright shadow-glow hover:brightness-110 sm:flex"
            >
              {t.openApp}
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </header>

      {/* ---- Hero -------------------------------------------------------- */}
      <section
        id="top"
        className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-32 md:grid-cols-[1.05fr_0.95fr] md:pb-28 md:pt-40"
      >
        <div className="max-w-xl">
          <div className="animate-fade-rise mb-5 inline-flex items-center gap-2 rounded-full border border-river/20 bg-river/10 px-3.5 py-1.5 text-xs font-semibold text-river">
            <Sparkles size={13} />
            {t.heroBadge}
          </div>
          <h1
            className="animate-fade-rise text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            {t.heroTitle.pre}
            <span className="hero-gradient-text">{t.heroTitle.hi}</span>
            {t.heroTitle.post}
          </h1>
          <p
            className="animate-fade-rise mt-4 text-base leading-relaxed text-ink/65 sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            {t.heroLede}
          </p>
          <div
            className="animate-fade-rise mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "280ms" }}
          >
            <a
              href={APP_URL}
              className="press flex items-center gap-2 rounded-full bg-river px-6 py-3.5 text-sm font-bold text-bright shadow-glow transition hover:brightness-110 sm:text-base"
            >
              {t.heroCtaPrimary}
              <ArrowRight size={17} />
            </a>
            <a
              href="#install"
              className="press liquid-control flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold text-ink/80 sm:text-base"
            >
              <MonitorSmartphone size={17} className="text-river" />
              {t.heroCtaSecondary}
            </a>
          </div>
          <p
            className="animate-fade-rise mt-5 text-xs text-ink/45"
            style={{ animationDelay: "340ms" }}
          >
            {t.heroFootnote}
          </p>
        </div>

        <div className="animate-fade-rise relative" style={{ animationDelay: "220ms" }}>
          {/* soft glow behind the phone */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgb(var(--river) / 0.35), rgb(var(--moss) / 0.12) 55%, transparent 75%)"
            }}
          />
          <Parallax speed={-0.06}>
            <PhoneFrame float activeTab={0}>
              <DashboardScreen />
            </PhoneFrame>
          </Parallax>
        </div>
      </section>

      {/* ---- Statement --------------------------------------------------- */}
      <section className="mx-auto max-w-4xl px-6 py-24 md:py-36">
        <ScrollWords
          key={t.statement1}
          className="font-display text-3xl font-bold leading-snug sm:text-5xl md:text-[3.4rem]"
          text={t.statement1}
        />
      </section>

      {/* ---- Showcase trio ------------------------------------------------ */}
      <section className="pb-24 md:pb-32">
        <Reveal className="mx-auto mb-4 max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{t.showcaseTitle}</h2>
          <p className="mt-3 text-ink/60">{t.showcaseSub}</p>
        </Reveal>
        <div className="no-scrollbar flex snap-x snap-mandatory items-center gap-6 overflow-x-auto px-8 py-14 md:justify-center md:gap-10 md:overflow-visible">
          <Parallax speed={0.12} disableBelow={768} className="shrink-0 snap-center">
            <div className="md:-rotate-3 md:scale-[0.88] md:opacity-90">
              <PhoneFrame activeTab={1} className="w-[260px] sm:w-[280px]">
                <TransactionsScreen />
              </PhoneFrame>
              <p className="mt-5 text-center text-sm font-semibold text-ink/50">
                {t.labelTransactions}
              </p>
            </div>
          </Parallax>
          <Parallax speed={-0.06} disableBelow={768} className="shrink-0 snap-center">
            <div>
              <PhoneFrame activeTab={0} className="w-[260px] sm:w-[300px]">
                <DashboardScreen />
              </PhoneFrame>
              <p className="mt-5 text-center text-sm font-semibold text-ink/50">
                {t.labelDashboard}
              </p>
            </div>
          </Parallax>
          <Parallax speed={0.18} disableBelow={768} className="shrink-0 snap-center">
            <div className="md:rotate-3 md:scale-[0.88] md:opacity-90">
              <PhoneFrame activeTab={2} className="w-[260px] sm:w-[280px]">
                <ReportsScreen />
              </PhoneFrame>
              <p className="mt-5 text-center text-sm font-semibold text-ink/50">{t.labelReports}</p>
            </div>
          </Parallax>
        </div>
        <p className="px-6 text-center text-xs text-ink/40 md:hidden">{t.swipeHint}</p>
      </section>

      {/* ---- Features ---------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{t.featuresTitle}</h2>
          <p className="mt-3 text-ink/60">{t.featuresSub}</p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.map((feature, i) => {
            const { icon: Icon, tone } = featureStyles[i];
            return (
              <Reveal key={feature.title} delay={(i % 3) * 90}>
                <div className="liquid-card h-full rounded-2xl border p-6">
                  <span className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
                    <Icon size={21} />
                  </span>
                  <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-ink/60">{feature.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---- Pinned quick-add scene --------------------------------------- */}
      <QuickAddScene />

      {/* ---- Bill reminders ------------------------------------------------ */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2 md:py-32">
        <Reveal className="order-2 md:order-1">
          <div className="relative flex justify-center py-10">
            <PhoneFrame activeTab={0} className="w-[260px] sm:w-[290px]">
              <DashboardScreen />
            </PhoneFrame>
            <Parallax speed={-0.16} className="absolute -top-2 left-0 z-10 sm:left-4 md:-left-4">
              <NotificationCard {...reminders[0]} />
            </Parallax>
            <Parallax speed={0.1} className="absolute right-0 top-1/3 z-10 sm:right-2 md:-right-6">
              <NotificationCard {...reminders[1]} />
            </Parallax>
            <Parallax speed={-0.07} className="absolute bottom-6 left-2 z-10 sm:left-8 md:-left-2">
              <NotificationCard {...reminders[2]} />
            </Parallax>
          </div>
        </Reveal>
        <Reveal className="order-1 md:order-2" delay={100}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-coral/20 bg-coral/10 px-3.5 py-1.5 text-xs font-semibold text-coral">
            <BellRing size={13} />
            {t.remindBadge}
          </div>
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {t.remindTitle}
          </h2>
          <p className="mt-4 max-w-md text-ink/60 sm:text-lg">{t.remindBody}</p>
        </Reveal>
      </section>

      {/* ---- Desktop ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-moss/20 bg-moss/10 px-3.5 py-1.5 text-xs font-semibold text-moss">
            <Monitor size={13} />
            {t.desktopBadge}
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">{t.desktopTitle}</h2>
          <p className="mt-3 text-ink/60">{t.desktopBody}</p>
        </Reveal>
        <Reveal delay={120}>
          <Parallax speed={0.05}>
            <DesktopMockup />
          </Parallax>
        </Reveal>
      </section>

      {/* ---- Statement 2 --------------------------------------------------- */}
      <section className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <ScrollWords
          key={t.statement2}
          className="font-display text-3xl font-bold leading-snug sm:text-5xl md:text-[3.4rem]"
          text={t.statement2}
        />
      </section>

      {/* ---- Install ------------------------------------------------------ */}
      <section id="install" className="mx-auto max-w-6xl scroll-mt-28 px-6 pb-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{t.installTitle}</h2>
          <p className="mt-3 text-ink/60">{t.installSub}</p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {t.platforms.map((platform, i) => {
            const Icon = platformIcons[i];
            return (
              <Reveal key={platform.label} delay={i * 100}>
                <div className="liquid-panel h-full border p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-bold">{platform.label}</h3>
                    <span className="flex items-center gap-1.5 rounded-full bg-river/10 px-3 py-1 text-xs font-semibold text-river">
                      <Icon size={13} />
                      {platform.note}
                    </span>
                  </div>
                  <ol className="space-y-3">
                    {platform.steps.map((step, n) => (
                      <li key={step} className="flex items-center gap-3 text-sm text-ink/75">
                        <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/10 text-xs font-bold text-ink/70">
                          {n + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---- Final CTA ----------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div className="liquid-panel overflow-hidden border p-10 text-center sm:p-14">
            <h2 className="mx-auto max-w-xl text-3xl font-bold sm:text-4xl">{t.ctaTagline}</h2>
            <p className="mx-auto mt-3 max-w-md text-ink/60">{t.ctaBody}</p>
            <a
              href={APP_URL}
              className="press mt-8 inline-flex items-center gap-2 rounded-full bg-river px-8 py-4 font-bold text-bright shadow-glow transition hover:brightness-110"
            >
              {t.ctaButton}
              <ArrowRight size={18} />
            </a>
          </div>
        </Reveal>
      </section>

      {/* ---- Footer -------------------------------------------------------- */}
      <footer className="border-t border-ink/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-ink/50 sm:flex-row">
          <span className="flex items-center gap-2">
            <Image src={appIcon} alt="" width={22} height={22} className="rounded-md" />
            <span className="font-display font-semibold text-ink/70">{SITE_NAME}</span>
            <span lang="my">{SITE_NAME_MY}</span>
          </span>
          <a href={APP_URL} className="hover:text-ink/80">
            {t.footerOpen}
          </a>
        </div>
      </footer>
    </main>
  );
}
