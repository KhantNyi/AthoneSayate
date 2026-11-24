"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Modal } from "./modal";
import { createPopupMotion, GlassLight, GlassNav, useAnimatedPresence } from "./glass-motion";
import { PwaExperience } from "./pwa-experience";
import { ArrowLeft, CheckCircle2, CircleAlert, CloudOff, LogIn, LogOut, Plus, RefreshCw, Settings, X } from "lucide-react";
import { currency } from "@athonesayate/shared/metrics";
import { AppProvider } from "./app-context";
import { Celebration, Mascot } from "./companion";
import { compactCurrency } from "@/lib/helpers";
import { navItems, planTabs, tabs } from "./nav";
import { QuickAddSheet } from "./quick-add-sheet";
import { ActivityStat, DashboardMonthControl, DashboardSkeleton, LanguageToggle, TabSkeleton, ThemeToggle } from "./ui";
import { useAppState } from "./use-app-state";
import type { Session } from "./use-session";

// Each tab is its own chunk so the initial load doesn't ship every screen.
const DashboardTab = dynamic(() => import("./tabs/dashboard-tab"), { loading: () => <DashboardSkeleton /> });
const ReportsTab = dynamic(() => import("./tabs/reports-tab"), { loading: () => <TabSkeleton /> });
const TransactionsTab = dynamic(() => import("./tabs/transactions-tab"), { loading: () => <TabSkeleton /> });
const BudgetsTab = dynamic(() => import("./tabs/budgets-tab"), { loading: () => <TabSkeleton /> });
const RecurringTab = dynamic(() => import("./tabs/recurring-tab"), { loading: () => <TabSkeleton /> });
const GoalsTab = dynamic(() => import("./tabs/goals-tab"), { loading: () => <TabSkeleton /> });
const SettingsTab = dynamic(() => import("./tabs/settings-tab"), { loading: () => <TabSkeleton /> });

const ACCOUNT_DOTS = ["rgb(var(--amber))", "rgb(var(--moss))", "rgb(var(--river))", "rgb(var(--pink))", "rgb(var(--violet))"];

type ExpenseTrackerAppProps = {
  session: Session;
  /** Signed-out preview: leaves the demo and shows the auth screen. */
  onRequestAuth?: (mode?: "signIn" | "signUp") => void;
};

export function ExpenseTrackerApp({ session, onRequestAuth }: ExpenseTrackerAppProps) {
  const app = useAppState();
  const {
    t,
    language,
    setLanguage,
    theme,
    toggleTheme,
    activeTab,
    activeNavKey,
    chooseTab,
    navigateTab,
    openNav,
    backTab,
    goBack,
    menuOpen,
    setMenuOpen,
    balances,
    isLoading,
    dataError,
    dataNotice,
    setDataNotice,
    actionAlert,
    clearActionAlert,
    syncState,
    usingCachedData,
    dashboardStatsMonth,
    changeDashboardMonth,
    dailyAllowance,
    currentMonthTotals,
    lastRecurringPayment,
    handleUndoRecurringPaid,
    undoingRecurringPaymentId,
    setQuickAddOpen,
    demoMode,
    signUpPromptOpen,
    setSignUpPromptOpen
  } = app;

  const moreButton = useRef<HTMLButtonElement>(null);
  const morePanel = useRef<HTMLDivElement>(null);
  const { present: morePresent, finishExit: finishMoreExit } = useAnimatedPresence(menuOpen);
  const moreMotion = useRef<ReturnType<typeof createPopupMotion> | null>(null);
  const moreEntered = useRef(false);
  const restoreMoreFocus = useRef(false);
  useLayoutEffect(() => {
    const panel = morePanel.current;
    if (!morePresent || !panel) return;
    moreMotion.current = createPopupMotion(panel);
    moreEntered.current = false;
    return () => { moreMotion.current?.destroy(); moreMotion.current = null; };
  }, [morePresent]);
  useLayoutEffect(() => {
    if (!moreMotion.current || !morePanel.current) return;
    if (menuOpen) restoreMoreFocus.current = false;
    const closed = { transform: "translateY(12px) scale(0.98)", opacity: "0" };
    moreMotion.current.play({
      open: menuOpen,
      from: moreEntered.current ? undefined : closed,
      to: menuOpen ? { transform: "none", opacity: "1" } : closed,
      duration: menuOpen ? 220 : 180,
      easing: menuOpen ? getComputedStyle(morePanel.current).getPropertyValue("--ease-glide").trim() || "ease-out" : "ease-in",
      onFinish: menuOpen ? undefined : () => {
        finishMoreExit();
        if (restoreMoreFocus.current) moreButton.current?.focus({ preventScroll: true });
        restoreMoreFocus.current = false;
      }
    });
    moreEntered.current = true;
  }, [menuOpen, morePresent, finishMoreExit]);
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !morePanel.current?.contains(event.target) && !moreButton.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        restoreMoreFocus.current = true;
        setMenuOpen(false);
      }
    };
    const desktop = window.matchMedia("(min-width: 1280px)");
    const resize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keydown);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", keydown);
      desktop.removeEventListener("change", resize);
    };
  }, [menuOpen, setMenuOpen]);

  const inPlan = activeNavKey === "plan";
  const title = inPlan ? t.plan : t[tabs[activeTab].label];

  // Only shown when there is something to say: quiet means everything is saved.
  const syncPill = !syncState.online || usingCachedData
    ? { tone: "bg-amber/10 text-amber", label: syncState.pending > 0 ? `Offline - ${syncState.pending} queued` : "Offline" }
    : syncState.pending > 0
      ? { tone: "bg-river/10 text-river", label: syncState.syncing ? "Syncing..." : `${syncState.pending} to sync` }
      : null;

  return (
    <AppProvider value={app}>
      <main className="liquid-ui app-shell min-h-screen text-ink xl:grid xl:grid-cols-[16rem_minmax(0,1fr)]" lang={language === "my" ? "my" : "en"}>
        <aside className="liquid-chrome sticky top-0 z-20 hidden h-dvh min-h-0 min-w-0 w-64 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(8rem,1fr)_auto] overflow-x-hidden overflow-y-auto border-r border-ink/10 bg-white px-4 py-5 xl:grid">
          <div className="mb-7 flex min-w-0 items-center gap-3 px-2">
            <Mascot mood="happy" size={34} />
            <p className="min-w-0 truncate font-display text-lg font-semibold tracking-tight text-ink">athonesayate</p>
          </div>
          <nav className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto pr-1" aria-label="Primary navigation">
            <GlassNav activeKey={activeNavKey} className="glass-sidebar-track grid gap-1 rounded-xl">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  data-glass-key={item.key}
                  type="button"
                  onClick={() => openNav(item.key)}
                  aria-current={activeNavKey === item.key ? "page" : undefined}
                  title={t[item.label]}
                  className={`glass-sidebar-item flex h-11 min-w-0 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ${
                    activeNavKey === item.key
                      ? "text-river"
                      : "text-ink/70 hover:text-river"
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  <span className="min-w-0 truncate">{t[item.label]}</span>
                </button>
              ))}
            </GlassNav>
          </nav>
          <div className="mt-4 grid min-w-0 gap-3">
            {demoMode ? (
              <button
                type="button"
                onClick={() => onRequestAuth?.()}
                className="liquid-control w-full rounded-xl border border-river/25 bg-river/5 p-3 text-left transition hover:bg-river/10"
              >
                <span className="block text-sm font-semibold text-river">Sample data</span>
                <span className="mt-0.5 block text-xs text-ink/55">Sign in to track your own</span>
              </button>
            ) : (
              <div className="liquid-control flex min-w-0 items-center gap-3 rounded-xl border border-ink/10 bg-white p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-moss text-sm font-bold uppercase text-bright">
                  {session.email?.charAt(0) ?? "A"}
                </span>
                <span className="min-w-0 flex-1">
                  <span title={session.email ?? undefined} className="block truncate text-sm font-semibold">{session.email ?? "Signed in"}</span>
                  <span className="block text-xs text-ink/45">Free plan</span>
                </span>
                <button
                  type="button"
                  onClick={() => void session.signOut()}
                  title="Sign out"
                  aria-label="Sign out"
                  className="ml-auto shrink-0 rounded-lg p-1.5 text-ink/45 transition hover:bg-rose-500/10 hover:text-rose-600"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
            <div className="min-w-0 border-t border-ink/10 pt-4">
              <p className="side-label mb-2 px-2">{t.accounts}</p>
              <ul className="grid gap-0.5">
                {balances.map((account, index) => (
                  <li key={account.id} className="flex items-center gap-3 px-2 py-1.5 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: ACCOUNT_DOTS[index % ACCOUNT_DOTS.length] }} />
                    <span className="min-w-0 flex-1 truncate text-ink/80">{account.name}</span>
                    <span className="tnum shrink-0 font-mono text-xs text-ink/55">{compactCurrency(account.balance)}</span>
                  </li>
                ))}
                <li className="mt-1 flex items-center justify-between gap-3 border-t border-ink/10 px-2 pt-2.5 text-sm">
                  <span className="text-ink/55">{t.accountBalance}</span>
                  <span className="tnum font-semibold">{currency.format(balances.reduce((sum, account) => sum + account.balance, 0))}</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <nav className="ios-tabbar fixed z-30 px-1.5 py-1.5 xl:hidden" aria-label="Primary navigation">
          <GlassNav activeKey={activeNavKey} className="grid grid-cols-5 gap-1 rounded-full">
            {navItems.map((item, index) => {
              const active = activeNavKey === item.key;
              return [
                // The add button sits in the middle of the dock, under the thumb.
                index === 2 ? (
                  <button
                    key="add"
                    type="button"
                    onClick={() => { setMenuOpen(false); setQuickAddOpen(true); }}
                    aria-label={t.quickAdd}
                    className="dock-add grid min-w-0 place-items-center"
                  >
                    <span className="dock-add-disc grid size-12 place-items-center rounded-full">
                      <Plus size={26} strokeWidth={2.8} />
                    </span>
                  </button>
                ) : null,
                <button
                  key={item.key}
                  data-glass-key={item.key}
                  type="button"
                  onClick={() => openNav(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={`ios-tab-item flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition duration-300 ${active ? "ios-tab-active" : ""}`}
                >
                  <item.icon size={20} strokeWidth={active ? 2.6 : 2.2} />
                  <span className="max-w-full truncate">{t[item.label]}</span>
                </button>
              ];
            })}
          </GlassNav>
        </nav>

        {morePresent ? (
          <div ref={morePanel} id="app-menu" data-state={menuOpen ? "open" : "closing"} inert={!menuOpen} className="glass-reactive ios-popover mobile-more fixed inset-x-3 z-40 p-2 xl:hidden" aria-label={t.menu}>
            <GlassLight />
            <div className="grid gap-1">
              <button
                type="button"
                onClick={() => navigateTab("settings")}
                aria-current={activeTab === "settings" ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold ${
                  activeTab === "settings" ? "bg-river/10 text-river" : "text-ink/70 hover:bg-ink/[0.04]"
                }`}
              >
                <Settings size={18} />
                {t.settings}
              </button>
              <div className="mt-1 flex items-center gap-2 border-t border-ink/10 pt-2">
                <LanguageToggle language={language} onChange={setLanguage} label={t.language} />
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </div>
              {demoMode ? (
                <button
                  type="button"
                  onClick={() => onRequestAuth?.()}
                  className="flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-river hover:bg-river/10"
                >
                  <LogIn size={18} />
                  Sign in or sign up
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void session.signOut()}
                  className="flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-ink/70 hover:bg-rose-500/10 hover:text-rose-600"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              )}
            </div>
          </div>
        ) : null}

        <section className="app-content min-w-0 px-3 pb-10 pt-3 sm:px-5 sm:pt-5 lg:px-7 xl:px-8">
          {/* Fades in as the large title scrolls away, where scroll-driven animations exist. */}
          <div className="scroll-titlebar" aria-hidden="true">
            <span className="truncate">{title}</span>
          </div>
          {demoMode ? (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-river/25 bg-river/5 py-1.5 pl-3 pr-1.5 text-xs">
              <span className="shrink-0 font-semibold text-river">Demo</span>
              <span className="min-w-0 flex-1 truncate text-ink/60">Sample data. Nothing here is saved.</span>
              <button
                type="button"
                onClick={() => onRequestAuth?.()}
                className="shrink-0 rounded-lg bg-gradient-to-r from-river to-indigo-500 px-2.5 py-1.5 font-semibold text-bright shadow-glow"
              >
                Sign in or sign up
              </button>
            </div>
          ) : null}
          <PwaExperience />
          <header className="mb-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              {backTab ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="-ml-1.5 mb-0.5 inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-sm font-medium text-ink/60 transition hover:bg-ink/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-river"
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  {t[tabs[backTab].label]}
                </button>
              ) : null}
              <h1 className="page-title truncate font-display text-2xl text-ink sm:text-3xl">{title}</h1>
            </div>
            {activeTab === "dashboard" ? (
              <div className="hidden w-72 sm:block lg:w-80">
                <DashboardMonthControl month={dashboardStatsMonth} onChange={changeDashboardMonth} />
              </div>
            ) : null}
            <div className="flex shrink-0 items-center gap-2">
              {syncPill ? (
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${syncPill.tone}`}>
                  {syncState.syncing ? <RefreshCw size={13} className="animate-spin" /> : <CloudOff size={13} />}
                  {syncPill.label}
                </span>
              ) : null}
              <div className="hidden items-center gap-2 xl:flex">
                <LanguageToggle language={language} onChange={setLanguage} label={t.language} />
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
                <button
                  type="button"
                  onClick={() => navigateTab("settings")}
                  aria-label={t.settings}
                  aria-current={activeTab === "settings" ? "page" : undefined}
                  title={t.settings}
                  className={`liquid-control grid size-11 shrink-0 place-items-center rounded-xl border border-ink/10 bg-white transition hover:border-river/30 hover:text-river ${activeTab === "settings" ? "text-river" : "text-ink/60"}`}
                >
                  <Settings size={17} />
                </button>
              </div>
              {/* Below desktop there is no sidebar, so the gear opens a menu that also holds sign-out. */}
              <button
                ref={moreButton}
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={t.menu}
                aria-expanded={menuOpen}
                aria-controls="app-menu"
                className={`liquid-control grid size-11 shrink-0 place-items-center rounded-xl border border-ink/10 bg-white transition hover:border-river/30 hover:text-river xl:hidden ${menuOpen || activeTab === "settings" ? "text-river" : "text-ink/60"}`}
              >
                <Settings size={17} />
              </button>
            </div>
          </header>

          {inPlan ? (
            <nav className="plan-segments liquid-control mb-4 grid grid-cols-3 gap-1 rounded-xl border border-ink/10 bg-white p-1 sm:inline-grid" aria-label={t.plan}>
              {planTabs.map((key) => {
                const Icon = tabs[key].icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigateTab(key)}
                    aria-current={activeTab === key ? "page" : undefined}
                    className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink/60 transition hover:text-ink sm:px-5"
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{t[tabs[key].label]}</span>
                  </button>
                );
              })}
            </nav>
          ) : null}

          {activeTab === "dashboard" ? (
            <div className="mb-4 grid gap-3 sm:hidden">
              <DashboardMonthControl month={dashboardStatsMonth} onChange={changeDashboardMonth} />
              <div className="grid grid-cols-2 gap-2">
                <ActivityStat label={t.safeToSpendDay} value={currency.format(dailyAllowance)} tone="river" />
                <ActivityStat label={t.savingsRate} value={`${currentMonthTotals.savingsRate.toFixed(1)}%`} tone="moss" />
              </div>
            </div>
          ) : null}

          {dataError && (
            <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral">
              <CircleAlert size={17} className="shrink-0" />
              <span>{dataError}</span>
            </div>
          )}

          <div key={activeTab} className="animate-tab-in">
            {activeTab === "dashboard" ? (
              <section id="dashboard" className="grid gap-4">
                {isLoading ? <DashboardSkeleton /> : <DashboardTab />}
              </section>
            ) : null}
            {activeTab === "reports" ? (
              <section id="reports" className="grid min-w-0 gap-4">
                <ReportsTab />
              </section>
            ) : null}
            {activeTab === "transactions" ? (
              <section className="grid gap-4">
                <TransactionsTab />
              </section>
            ) : null}
            {activeTab === "budgets" ? (
              <section className="grid gap-4">
                <BudgetsTab />
              </section>
            ) : null}
            {activeTab === "recurring" ? (
              <section className="grid gap-4">
                <RecurringTab />
              </section>
            ) : null}
            {activeTab === "goals" ? (
              <section className="grid gap-4">
                <GoalsTab />
              </section>
            ) : null}
            {activeTab === "settings" ? (
              <section className="grid gap-4">
                <SettingsTab />
              </section>
            ) : null}
          </div>
        </section>

        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          aria-label={t.quickAdd}
          className="glass-reactive liquid-fab fixed bottom-8 right-8 z-40 hidden size-16 place-items-center rounded-full border border-white/40 hover:scale-[1.02] xl:grid"
        >
          <GlassLight />
          <Plus size={30} strokeWidth={2.6} />
        </button>

        <QuickAddSheet />
        <Celebration />

        {/* Why an action didn't go through. Floats so it reaches the user even
            when the form that failed is far up the page. */}
        {actionAlert ? (
          <div className="pointer-events-none fixed inset-x-3 bottom-32 z-[70] flex justify-center xl:inset-x-auto xl:bottom-9 xl:right-28 xl:justify-end">
            <div
              role="alert"
              className="liquid-toast pointer-events-auto flex max-w-full animate-toast-in items-center gap-3 rounded-xl border border-coral/25 bg-coral/10 py-2.5 pl-4 pr-2 text-sm font-medium text-coral shadow-lift"
            >
              <CircleAlert size={18} className="shrink-0" />
              <span className="min-w-0">{actionAlert.message}</span>
              {actionAlert.fix ? (
                <button
                  type="button"
                  onClick={() => {
                    chooseTab(actionAlert.fix!.tab);
                    clearActionAlert();
                  }}
                  className="shrink-0 rounded-lg border border-coral/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-coral/10"
                >
                  {actionAlert.fix.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={clearActionAlert}
                aria-label="Dismiss alert"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-coral/60 transition hover:bg-coral/10 hover:text-coral"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ) : null}

        {dataNotice && !actionAlert ? (
          <div className="pointer-events-none fixed inset-x-3 bottom-32 z-[70] flex justify-center xl:inset-x-auto xl:bottom-9 xl:right-28 xl:justify-end">
            <div role="status" className="liquid-toast pointer-events-auto flex max-w-full animate-toast-in items-center gap-3 rounded-xl border border-ink/10 bg-white py-2.5 pl-4 pr-2 text-sm font-medium shadow-lift">
              <CheckCircle2 size={18} className="shrink-0 text-moss" />
              <span className="min-w-0">{dataNotice}</span>
              {lastRecurringPayment && dataNotice === lastRecurringPayment.notice ? (
                <button
                  type="button"
                  onClick={handleUndoRecurringPaid}
                  disabled={undoingRecurringPaymentId === lastRecurringPayment.transaction.id}
                  className="shrink-0 rounded-lg border border-river/25 px-2.5 py-1 text-xs font-semibold text-river transition hover:bg-river/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {undoingRecurringPaymentId === lastRecurringPayment.transaction.id ? "Undoing" : "Undo"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDataNotice("")}
                aria-label="Dismiss notification"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-ink/40 transition hover:bg-ink/5 hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ) : null}

        <Modal open={signUpPromptOpen} onClose={() => setSignUpPromptOpen(false)} labelledBy="signup-prompt-title" centered>
          <div className="liquid-sheet liquid-scroll w-full max-w-sm overflow-y-auto rounded-2xl border p-6 shadow-lift">
            <Mascot mood="happy" size={56} />
            <h2 id="signup-prompt-title" className="mt-4 font-display text-lg font-semibold">Create an account to save this</h2>
            <p className="mt-2 text-sm text-ink/60">
              You&apos;re exploring with sample data. Sign up to start tracking your own spending — it takes a few seconds,
              and you&apos;ll begin with a clean set of categories.
            </p>
            <button
              type="button"
              onClick={() => onRequestAuth?.("signUp")}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-river to-indigo-500 px-4 py-2.5 text-sm font-semibold text-bright shadow-glow"
            >
              Create free account
            </button>
            <button
              type="button"
              onClick={() => setSignUpPromptOpen(false)}
              className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-ink/55 transition hover:bg-ink/5"
            >
              Keep looking around
            </button>
          </div>
        </Modal>
      </main>
    </AppProvider>
  );
}
