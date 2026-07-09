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
  Zap
} from "lucide-react";
import { Parallax, ScrollWords } from "@/components/motion";
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
import { APP_URL, SITE_NAME, SITE_NAME_MY, SITE_TAGLINE } from "@/lib/site";
import appIcon from "./icon.png";

const features = [
  {
    icon: Zap,
    tone: "text-amber bg-amber/10",
    title: "Log spending in seconds",
    body: "A quick-add sheet that opens from anywhere — amount, category, done. No forms standing between you and getting on with your day."
  },
  {
    icon: ChartLine,
    tone: "text-river bg-river/10",
    title: "See where money goes",
    body: "Spending pace, category mix, month-over-month trends — live charts that answer the question before you finish asking it."
  },
  {
    icon: Target,
    tone: "text-moss bg-moss/10",
    title: "Budgets & goals",
    body: "Set monthly budgets per category and savings goals, then watch the progress bars keep you honest."
  },
  {
    icon: BellRing,
    tone: "text-coral bg-coral/10",
    title: "Bill reminders",
    body: "Recurring rent, subscriptions, utilities — get a push notification before the due date, not a late fee after it."
  },
  {
    icon: CloudOff,
    tone: "text-river bg-river/10",
    title: "Works offline",
    body: "It's a PWA: install it on your home screen and log expenses on the train, in a basement, anywhere. It syncs when you're back."
  },
  {
    icon: MoonStar,
    tone: "text-amber bg-amber/10",
    title: "Light & dark, liquid glass",
    body: "An iOS-inspired glass interface that follows your system theme — flip the toggle above to see for yourself."
  }
];

const iosSteps = [
  "Open the app in Safari",
  "Tap the Share button",
  "Choose “Add to Home Screen”"
];

const androidSteps = [
  "Open the app in Chrome",
  "Tap the ⋮ menu",
  "Choose “Add to Home screen” / “Install app”"
];

const desktopSteps = [
  "Open the app in Chrome or Edge",
  "Click the install icon in the address bar",
  "Launch it from your dock or taskbar"
];

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
    <div className="liquid-panel w-60 border p-3 sm:w-64">
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
            <ThemeToggle />
            <a
              href={APP_URL}
              className="press flex items-center gap-1.5 rounded-full bg-river px-4 py-2 text-sm font-semibold text-bright shadow-glow hover:brightness-110"
            >
              Open app
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
            Free · Installable PWA · Phone & desktop
          </div>
          <h1
            className="animate-fade-rise text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Know where <span className="hero-gradient-text">every baht</span> goes.
          </h1>
          <p
            lang="my"
            className="animate-fade-rise mt-4 text-sm font-medium text-ink/55"
            style={{ animationDelay: "140ms" }}
          >
            အသုံးစရိတ်ကို လွယ်ကူမြန်ဆန်စွာ မှတ်တမ်းတင်ပါ။
          </p>
          <p
            className="animate-fade-rise mt-4 text-base leading-relaxed text-ink/65 sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            {SITE_NAME} is a fast, personal expense tracker. Log a purchase in seconds,
            see your budgets and trends at a glance, and get a nudge before bills are due —
            all in an app that lives on your home screen and works offline.
          </p>
          <div
            className="animate-fade-rise mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "280ms" }}
          >
            <a
              href={APP_URL}
              className="press flex items-center gap-2 rounded-full bg-river px-6 py-3.5 text-sm font-bold text-bright shadow-glow transition hover:brightness-110 sm:text-base"
            >
              Open the app
              <ArrowRight size={17} />
            </a>
            <a
              href="#install"
              className="press liquid-control flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold text-ink/80 sm:text-base"
            >
              <MonitorSmartphone size={17} className="text-river" />
              Install on your phone
            </a>
          </div>
          <p
            className="animate-fade-rise mt-5 text-xs text-ink/45"
            style={{ animationDelay: "340ms" }}
          >
            Nothing to download from an app store — it runs right in your browser.
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
          className="font-display text-3xl font-bold leading-snug sm:text-5xl md:text-[3.4rem]"
          text="Most spending is invisible. A coffee here, a ride there — gone. Athonesayate turns it back into something you can see, and change."
        />
      </section>

      {/* ---- Showcase trio ------------------------------------------------ */}
      <section className="pb-24 md:pb-32">
        <Reveal className="mx-auto mb-4 max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">One glance, full picture.</h2>
          <p className="mt-3 text-ink/60">
            Dashboard, transactions, reports — every screen answers a question you actually have.
          </p>
        </Reveal>
        <div className="no-scrollbar flex snap-x snap-mandatory items-center gap-6 overflow-x-auto px-8 py-14 md:justify-center md:gap-10 md:overflow-visible">
          <Parallax speed={0.12} disableBelow={768} className="shrink-0 snap-center">
            <div className="md:-rotate-3 md:scale-[0.88] md:opacity-90">
              <PhoneFrame activeTab={1} className="w-[260px] sm:w-[280px]">
                <TransactionsScreen />
              </PhoneFrame>
              <p className="mt-5 text-center text-sm font-semibold text-ink/50">Transactions</p>
            </div>
          </Parallax>
          <Parallax speed={-0.06} disableBelow={768} className="shrink-0 snap-center">
            <div>
              <PhoneFrame activeTab={0} className="w-[260px] sm:w-[300px]">
                <DashboardScreen />
              </PhoneFrame>
              <p className="mt-5 text-center text-sm font-semibold text-ink/50">Dashboard</p>
            </div>
          </Parallax>
          <Parallax speed={0.18} disableBelow={768} className="shrink-0 snap-center">
            <div className="md:rotate-3 md:scale-[0.88] md:opacity-90">
              <PhoneFrame activeTab={2} className="w-[260px] sm:w-[280px]">
                <ReportsScreen />
              </PhoneFrame>
              <p className="mt-5 text-center text-sm font-semibold text-ink/50">Reports</p>
            </div>
          </Parallax>
        </div>
        <p className="px-6 text-center text-xs text-ink/40 md:hidden">Swipe to see more screens →</p>
      </section>

      {/* ---- Features ---------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Everything a money diary should be
          </h2>
          <p className="mt-3 text-ink/60">
            Built for people who actually track their spending every day — so every tap is fast,
            legible, and a little bit satisfying.
          </p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 90}>
              <div className="liquid-card h-full rounded-2xl border p-6">
                <span
                  className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${feature.tone}`}
                >
                  <feature.icon size={21} />
                </span>
                <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-ink/60">{feature.body}</p>
              </div>
            </Reveal>
          ))}
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
            Push notifications
          </div>
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Never pay late
            <br />
            again.
          </h2>
          <p className="mt-4 max-w-md text-ink/60 sm:text-lg">
            Set up rent, subscriptions, and utilities once. {SITE_NAME} watches the calendar
            and taps you on the shoulder before the due date — right on your lock screen,
            even when the app is closed.
          </p>
        </Reveal>
      </section>

      {/* ---- Desktop ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-moss/20 bg-moss/10 px-3.5 py-1.5 text-xs font-semibold text-moss">
            <Monitor size={13} />
            Desktop ready
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">Big screen, bigger picture.</h2>
          <p className="mt-3 text-ink/60">
            The same app scales up. Open {SITE_NAME} in a browser tab — or install it as a
            desktop app — and the dashboard spreads out: four-up metrics, wide charts, and
            your whole month on one screen.
          </p>
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
          className="font-display text-3xl font-bold leading-snug sm:text-5xl md:text-[3.4rem]"
          text="Feels native. Installs in a tap. Works offline. On your phone and your desktop — no app store between you and your money."
        />
      </section>

      {/* ---- Install ------------------------------------------------------ */}
      <section id="install" className="mx-auto max-w-6xl scroll-mt-28 px-6 pb-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Install it anywhere</h2>
          <p className="mt-3 text-ink/60">
            {SITE_NAME} installs like a native app — full screen, its own icon, push
            notifications — on your phone and your computer, without an app store in the way.
          </p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "iPhone & iPad", note: "Safari", steps: iosSteps, icon: Share },
            { label: "Android", note: "Chrome", steps: androidSteps, icon: MonitorSmartphone },
            { label: "Desktop", note: "Chrome · Edge", steps: desktopSteps, icon: Monitor }
          ].map((platform, i) => (
            <Reveal key={platform.label} delay={i * 100}>
              <div className="liquid-panel h-full border p-7">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-bold">{platform.label}</h3>
                  <span className="flex items-center gap-1.5 rounded-full bg-river/10 px-3 py-1 text-xs font-semibold text-river">
                    <platform.icon size={13} />
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
          ))}
        </div>
      </section>

      {/* ---- Final CTA ----------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div className="liquid-panel overflow-hidden border p-10 text-center sm:p-14">
            <p lang="my" className="mb-2 text-sm font-medium text-ink/50">
              {SITE_NAME_MY}
            </p>
            <h2 className="mx-auto max-w-xl text-3xl font-bold sm:text-4xl">
              {SITE_TAGLINE}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-ink/60">
              Your first expense takes ten seconds to log. The habit pays for itself.
            </p>
            <a
              href={APP_URL}
              className="press mt-8 inline-flex items-center gap-2 rounded-full bg-river px-8 py-4 font-bold text-bright shadow-glow transition hover:brightness-110"
            >
              Start tracking
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
            Open the app →
          </a>
        </div>
      </footer>
    </main>
  );
}
