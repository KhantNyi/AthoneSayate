"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, ChevronRight, CircleAlert, CloudOff, LogIn, LogOut, MoreHorizontal, Plus, RefreshCw, WalletCards, X } from "lucide-react";
import { endOfMonth, format } from "date-fns";
import { currency } from "@athonesayate/shared/metrics";
import { AppProvider } from "./app-context";
import { navItems } from "./nav";
import { QuickAddSheet } from "./quick-add-sheet";
import { ActivityStat, DashboardMonthControl, DashboardSkeleton, LanguageToggle, StatusPill, TabSkeleton, ThemeToggle } from "./ui";
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
    setActiveTab,
    chooseTab,
    activeNavItem,
    mobilePrimaryNavItems,
    mobileMoreNavItems,
    mobileMoreActive,
    mobileMoreOpen,
    setMobileMoreOpen,
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

  const syncPill = !syncState.online || usingCachedData
    ? { tone: "amber" as const, label: syncState.pending > 0 ? `Offline - ${syncState.pending} queued` : "Offline" }
    : syncState.pending > 0
      ? { tone: "river" as const, label: syncState.syncing ? "Syncing..." : `${syncState.pending} to sync` }
      : null;

  return (
    <AppProvider value={app}>
      <main className="liquid-ui min-h-screen overflow-x-clip pb-36 text-ink xl:grid xl:grid-cols-[16rem_minmax(0,1fr)] xl:pb-0" lang={language === "my" ? "my" : "en"}>
        <aside className="liquid-chrome sticky top-0 z-20 hidden h-screen min-h-0 w-64 grid-rows-[auto_minmax(0,1fr)_auto] border-r border-ink/10 bg-white px-4 py-5 xl:grid">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-river to-indigo-500 text-bright shadow-glow">
              <WalletCards size={22} />
            </div>
            <div>
              <p className="bg-gradient-to-r from-river to-indigo-500 bg-clip-text font-display text-lg font-bold tracking-tight text-transparent">athonesayate</p>
              <p className="text-xs text-ink/55">{t.personalFinanceCockpit}</p>
            </div>
          </div>
          <nav className="min-h-0 space-y-1 overflow-y-auto pr-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition duration-200 ${
                  activeTab === item.key
                    ? "bg-gradient-to-r from-river to-indigo-500 text-bright shadow-glow"
                    : "text-ink/70 hover:translate-x-0.5 hover:bg-river/10 hover:text-river"
                }`}
              >
                <item.icon size={18} />
                {t[item.label]}
              </button>
            ))}
          </nav>
          <div className="mt-4 grid gap-3">
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
              <div className="liquid-control flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-moss text-sm font-bold uppercase text-bright">
                  {session.email?.charAt(0) ?? "A"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{session.email ?? "Signed in"}</span>
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
            <div className="liquid-card rounded-xl border border-ink/10 bg-white p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-ink/55">{t.accountBalance}</span>
                <ChevronRight className="shrink-0 text-ink/40" size={16} />
              </div>
              <p className="tnum mt-2 font-display text-xl font-semibold">
                {currency.format(balances.reduce((sum, account) => sum + account.balance, 0))}
              </p>
              <div className="mt-7 flex items-center gap-2 text-xs text-ink/50">
                <span className="size-2 rounded-full bg-moss" />
                2m ago
              </div>
            </div>
          </div>
        </aside>

        <nav className="ios-tabbar fixed z-30 px-1.5 py-1.5 xl:hidden" aria-label="Primary navigation">
          <div className="grid grid-cols-5 gap-1">
            {mobilePrimaryNavItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => chooseTab(item.key)}
                className={`ios-tab-item flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition duration-300 ${
                  activeTab === item.key ? "ios-tab-active" : ""
                }`}
              >
                <item.icon size={20} strokeWidth={activeTab === item.key ? 2.6 : 2.2} />
                <span className="max-w-full truncate">{t[item.label]}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
              className={`ios-tab-item flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition duration-300 ${
                mobileMoreOpen || mobileMoreActive ? "ios-tab-active" : ""
              }`}
            >
              <MoreHorizontal size={20} strokeWidth={mobileMoreOpen || mobileMoreActive ? 2.6 : 2.2} />
              <span className="max-w-full truncate">More</span>
            </button>
          </div>
        </nav>

        {mobileMoreOpen ? (
          <div className="ios-popover fixed inset-x-3 bottom-28 z-40 p-2 xl:hidden">
            <div className="grid gap-1">
              {mobileMoreNavItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => chooseTab(item.key)}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold ${
                    activeTab === item.key ? "bg-river/10 text-river" : "text-ink/70 hover:bg-ink/[0.04]"
                  }`}
                >
                  <item.icon size={18} />
                  {t[item.label]}
                </button>
              ))}
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

        <section className="min-w-0 px-3 pb-10 pt-3 sm:px-5 sm:pt-5 lg:px-7 xl:px-8">
          {demoMode ? (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-river/25 bg-river/5 px-4 py-2.5 text-sm">
              <span className="font-semibold text-river">Demo</span>
              <span className="min-w-0 text-ink/65">You&apos;re exploring sample data. Nothing here is saved.</span>
              <button
                type="button"
                onClick={() => onRequestAuth?.()}
                className="ml-auto shrink-0 rounded-lg bg-gradient-to-r from-river to-indigo-500 px-3 py-1.5 text-xs font-semibold text-bright shadow-glow"
              >
                Sign in or sign up
              </button>
            </div>
          ) : null}
          <header className="mb-5 grid items-center gap-3 xl:grid-cols-[340px_minmax(280px,1fr)_auto]">
            <div className="min-w-0">
              <p className="hidden text-sm font-medium text-river sm:block">{format(new Date(), "MMMM yyyy")}</p>
              <p className="text-xs font-semibold uppercase text-river sm:hidden">{t[activeNavItem.label]}</p>
              <h1 className="font-display text-xl font-semibold text-ink sm:whitespace-nowrap sm:text-3xl xl:text-4xl">
                <span className="bg-gradient-to-r from-river to-indigo-500 bg-clip-text text-transparent sm:hidden">athonesayate</span>
                <span className="hidden sm:inline">{t.expenseTracker}</span>
              </h1>
            </div>
            {activeTab === "dashboard" ? (
              <div className="hidden justify-center xl:flex">
                <DashboardMonthControl month={dashboardStatsMonth} onChange={changeDashboardMonth} />
              </div>
            ) : null}
            <div className="flex items-center gap-2 sm:hidden">
              {syncPill ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber/10 px-2.5 py-1.5 text-xs font-semibold text-amber">
                  {syncState.syncing ? <RefreshCw size={13} className="animate-spin" /> : <CloudOff size={13} />}
                  {syncPill.label}
                </span>
              ) : null}
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
            <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              <LanguageToggle language={language} onChange={setLanguage} label={t.language} />
              {syncPill ? <StatusPill tone={syncPill.tone} label={syncPill.label} /> : <StatusPill tone="moss" label="On track" />}
              <StatusPill tone="river" label={`${Math.max(0, endOfMonth(new Date()).getDate() - new Date().getDate() + 1)} days left`} />
            </div>
          </header>

          {activeTab === "dashboard" ? (
            <div className="mb-4 grid gap-3 xl:hidden">
              <DashboardMonthControl month={dashboardStatsMonth} onChange={changeDashboardMonth} />
              <div className="grid grid-cols-2 gap-2 sm:hidden">
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
              <section id="reports" className="mt-4 grid min-w-0 gap-4">
                <ReportsTab />
              </section>
            ) : null}
            {activeTab === "transactions" ? (
              <section className="mt-4 grid gap-4">
                <TransactionsTab />
              </section>
            ) : null}
            {activeTab === "budgets" ? (
              <section className="mt-4 grid gap-4">
                <BudgetsTab />
              </section>
            ) : null}
            {activeTab === "recurring" ? (
              <section className="mt-4 grid gap-4">
                <RecurringTab />
              </section>
            ) : null}
            {activeTab === "goals" ? (
              <section className="mt-4 grid gap-4">
                <GoalsTab />
              </section>
            ) : null}
            {activeTab === "settings" ? (
              <section className="mt-4 grid gap-4">
                <SettingsTab />
              </section>
            ) : null}
          </div>
        </section>

        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          aria-label={t.quickAdd}
          className="liquid-fab group fixed bottom-32 right-4 z-40 grid size-16 place-items-center rounded-full border border-white/40 transition duration-200 hover:scale-105 hover:shadow-lift active:scale-95 xl:bottom-8 xl:right-8"
        >
          <Plus size={30} strokeWidth={2.6} className="transition duration-300 group-hover:rotate-90" />
        </button>

        <QuickAddSheet />

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

        {dataNotice ? (
          <div className="pointer-events-none fixed inset-x-3 bottom-32 z-[70] flex justify-center xl:inset-x-auto xl:bottom-9 xl:right-28 xl:justify-end">
            <div className="liquid-toast pointer-events-auto flex max-w-full animate-toast-in items-center gap-3 rounded-xl border border-ink/10 bg-white py-2.5 pl-4 pr-2 text-sm font-medium shadow-lift">
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

        {signUpPromptOpen ? (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/40 px-5 backdrop-blur-sm">
            <div className="liquid-chrome w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-6 shadow-lift">
              <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-river to-indigo-500 text-bright shadow-glow">
                <WalletCards size={22} />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold">Create an account to save this</h2>
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
          </div>
        ) : null}
      </main>
    </AppProvider>
  );
}
