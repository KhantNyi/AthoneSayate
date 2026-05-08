"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  Home,
  Languages,
  LayoutDashboard,
  LineChart,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Target,
  Trash2,
  WalletCards
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { format, parseISO } from "date-fns";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createTransaction, fetchExpenseData, removeTransaction } from "@/lib/supabase-data";
import {
  accountBalances,
  categorySpend,
  currency,
  dailySeries,
  monthTransactions,
  monthlyComparison,
  preciseCurrency,
  safeToSpend,
  totals,
  upcomingRules,
  weekdaySpend
} from "@/lib/metrics";
import type { Account, Category, Goal, RecurringRule, Transaction, TransactionType } from "@/lib/types";

type Language = "en" | "my";

const translations = {
  en: {
    account: "Account",
    accountBalance: "Account balance",
    accounts: "Accounts",
    action: "Action",
    activeAccounts: "active accounts",
    add: "Add",
    allTimeNet: "all-time net",
    amount: "Amount",
    balances: "Balances",
    budgetHealth: "Budget health",
    budgets: "Budgets",
    category: "Category",
    categoryMix: "Category mix",
    currentMonth: "Current month",
    dashboard: "Dashboard",
    dailyExpenseTrend: "Daily expense trend",
    date: "Date",
    dueIn: "due in",
    entries: "entries",
    expense: "Expense",
    expenseTracker: "Expense tracker",
    goals: "Goals",
    income: "Income",
    language: "Language",
    merchant: "Merchant",
    monthExpenses: "Month expenses",
    monthIncome: "Month income",
    monthlyLimits: "Monthly limits",
    netCashFlow: "Net cash flow",
    optionalNote: "Optional note",
    personalFinanceCockpit: "Personal finance cockpit",
    recurring: "Recurring",
    reports: "Reports",
    rules: "rules",
    safeToSpendDay: "safe to spend/day",
    savingsProgress: "Savings progress",
    savingsRate: "savings rate",
    searchPlaceholder: "Search merchant, note, category, account",
    settings: "Settings",
    snapshot: "May 2026 snapshot",
    spendingPace: "Spending pace",
    transactions: "Transactions",
    vsLastMonth: "vs last month",
    weekdayPattern: "Weekday pattern"
  },
  my: {
    account: "အကောင့်",
    accountBalance: "အကောင့် လက်ကျန်",
    accounts: "အကောင့်များ",
    action: "လုပ်ဆောင်ချက်",
    activeAccounts: "အသုံးပြုနေသော အကောင့်",
    add: "ထည့်ရန်",
    allTimeNet: "စုစုပေါင်း အသားတင်",
    amount: "ပမာဏ",
    balances: "လက်ကျန်များ",
    budgetHealth: "ဘတ်ဂျက် အခြေအနေ",
    budgets: "ဘတ်ဂျက်များ",
    category: "အမျိုးအစား",
    categoryMix: "အသုံးစရိတ် အချိုး",
    currentMonth: "ယခုလ",
    dashboard: "ဒက်ရှ်ဘုတ်",
    dailyExpenseTrend: "နေ့စဉ် အသုံးစရိတ် လမ်းကြောင်း",
    date: "ရက်စွဲ",
    dueIn: "ကျန်ရက်",
    entries: "မှတ်တမ်း",
    expense: "အသုံးစရိတ်",
    expenseTracker: "အသုံးစရိတ် မှတ်တမ်း",
    goals: "ရည်မှန်းချက်များ",
    income: "ဝင်ငွေ",
    language: "ဘာသာစကား",
    merchant: "ဆိုင်/လက်ခံသူ",
    monthExpenses: "ယခုလ အသုံးစရိတ်",
    monthIncome: "ယခုလ ဝင်ငွေ",
    monthlyLimits: "လစဉ် ကန့်သတ်ချက်",
    netCashFlow: "အသားတင် ငွေစီးဆင်းမှု",
    optionalNote: "မှတ်ချက် ထည့်နိုင်သည်",
    personalFinanceCockpit: "ကိုယ်ပိုင်ငွေကြေး စီမံခန့်ခွဲမှု",
    recurring: "ပုံမှန် ဖြစ်သော",
    reports: "အစီရင်ခံစာ",
    rules: "စည်းမျဉ်း",
    safeToSpendDay: "တစ်နေ့ သုံးနိုင်သည့် ပမာဏ",
    savingsProgress: "စုဆောင်းမှု တိုးတက်မှု",
    savingsRate: "စုဆောင်းနှုန်း",
    searchPlaceholder: "ဆိုင်၊ မှတ်ချက်၊ အမျိုးအစား၊ အကောင့် ရှာရန်",
    settings: "ဆက်တင်များ",
    snapshot: "၂၀၂၆ မေ လ အခြေအနေ",
    spendingPace: "အသုံးစရိတ် အရှိန်",
    transactions: "မှတ်တမ်းများ",
    vsLastMonth: "ယခင်လနှင့် နှိုင်းယှဉ်",
    weekdayPattern: "ရက်သတ္တပတ် ပုံစံ"
  }
} as const;

const categoryTranslations: Record<string, string> = {
  Salary: "လစာ",
  Housing: "နေအိမ်",
  Food: "အစားအစာ",
  Transport: "သယ်ယူပို့ဆောင်ရေး",
  Bills: "ဘီလ်များ",
  Entertainment: "ဖျော်ဖြေရေး",
  Health: "ကျန်းမာရေး",
  Savings: "စုဆောင်းငွေ"
};

const frequencyTranslations: Record<string, string> = {
  weekly: "အပတ်စဉ်",
  biweekly: "နှစ်ပတ်တစ်ကြိမ်",
  monthly: "လစဉ်",
  quarterly: "သုံးလတစ်ကြိမ်",
  yearly: "နှစ်စဉ်"
};

const navItems = [
  { key: "dashboard", label: "dashboard", icon: LayoutDashboard },
  { key: "transactions", label: "transactions", icon: ReceiptText },
  { key: "budgets", label: "budgets", icon: CircleDollarSign },
  { key: "recurring", label: "recurring", icon: CalendarClock },
  { key: "goals", label: "goals", icon: Target },
  { key: "reports", label: "reports", icon: LineChart },
  { key: "settings", label: "settings", icon: Settings }
] as const;

export default function ExpenseTrackerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [occurredOn, setOccurredOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setDataError("");
        const data = await fetchExpenseData();

        if (ignore) {
          return;
        }

        setAccounts(data.accounts);
        setCategories(data.categories);
        setGoals(data.goals);
        setRecurringRules(data.recurringRules);
        setTransactions(data.transactions);
        setAccountId(data.accounts[0]?.id ?? "");
        setCategoryId(data.categories.find((category) => category.kind === "expense")?.id ?? "");
      } catch (error) {
        if (!ignore) {
          setDataError(error instanceof Error ? error.message : "Unable to load Supabase data.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const currentCategory = categories.find((category) => category.id === categoryId);

    if (currentCategory?.kind !== type) {
      setCategoryId(categories.find((category) => category.kind === type)?.id ?? "");
    }
  }, [categories, categoryId, type]);

  const monthTx = useMemo(() => monthTransactions(transactions), [transactions]);
  const monthTotals = useMemo(() => totals(monthTx), [monthTx]);
  const allTotals = useMemo(() => totals(transactions), [transactions]);
  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const budgetRows = useMemo(() => categorySpend(categories, monthTx), [categories, monthTx]);
  const comparison = useMemo(() => monthlyComparison(transactions), [transactions]);
  const daily = useMemo(() => dailySeries(monthTx), [monthTx]);
  const weekday = useMemo(() => weekdaySpend(monthTx), [monthTx]);
  const upcoming = useMemo(() => upcomingRules(recurringRules), [recurringRules]);
  const recurringDue = upcoming.filter((rule) => rule.type === "expense" && rule.daysUntilDue >= 0).reduce((sum, rule) => sum + rule.amount, 0);
  const dailyAllowance = safeToSpend(monthTotals.income, monthTotals.expenses, recurringDue);
  const t = translations[language];
  const categoryLabel = (name?: string) => (language === "my" && name ? categoryTranslations[name] ?? name : name);
  const frequencyLabel = (value: string) => (language === "my" ? frequencyTranslations[value] ?? value : value);
  const canAddTransaction = Boolean(accountId && merchant.trim() && Number(amount) > 0 && !isSaving);

  const filteredTransactions = transactions
    .filter((tx) => {
      const category = categories.find((item) => item.id === tx.categoryId);
      const account = accounts.find((item) => item.id === tx.accountId);
      const haystack = `${tx.merchant} ${tx.notes ?? ""} ${category?.name ?? ""} ${account?.name ?? ""}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    })
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || !merchant.trim() || !accountId) {
      return;
    }

    try {
      setIsSaving(true);
      setDataError("");
      const transaction = await createTransaction({
        accountId,
        categoryId: categoryId || undefined,
        type,
        amount: parsedAmount,
        occurredOn,
        merchant: merchant.trim(),
        notes: notes.trim()
      });

      setTransactions((current) => [transaction, ...current]);
      setAmount("");
      setMerchant("");
      setNotes("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to save transaction.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTransaction(id: string) {
    const previous = transactions;
    setTransactions((current) => current.filter((tx) => tx.id !== id));

    try {
      setDataError("");
      await removeTransaction(id);
    } catch (error) {
      setTransactions(previous);
      setDataError(error instanceof Error ? error.message : "Unable to delete transaction.");
    }
  }

  return (
    <main className="min-h-screen pb-20 text-ink xl:pb-0" lang={language === "my" ? "my" : "en"}>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-ink/10 bg-paper/88 px-4 py-5 backdrop-blur xl:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid size-11 place-items-center rounded-lg bg-ink text-paper">
            <WalletCards size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold">athonesayate</p>
            <p className="text-xs text-ink/55">{t.personalFinanceCockpit}</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={`#${item.key}`}
              className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink/70 transition hover:bg-white hover:text-ink"
            >
              <item.icon size={18} />
              {t[item.label]}
            </a>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/94 px-2 py-2 shadow-[0_-12px_30px_rgba(23,32,28,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
          {navItems.slice(0, 5).map((item) => (
            <a
              key={item.key}
              href={`#${item.key}`}
              className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium text-ink/65"
            >
              <item.icon size={18} />
              <span className="max-w-full truncate">{t[item.label]}</span>
            </a>
          ))}
        </div>
      </nav>

      <section className="px-3 pb-10 pt-3 sm:px-6 sm:pt-4 lg:px-8 xl:ml-64">
        <header className="mb-6 flex flex-col gap-4 rounded-none border-b border-ink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-river">{t.snapshot}</p>
            <h1 className="text-2xl font-semibold tracking-normal text-ink sm:text-4xl">{t.expenseTracker}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle language={language} onChange={setLanguage} label={t.language} />
            <StatusPill tone="river" label={`${currency.format(dailyAllowance)} ${t.safeToSpendDay}`} />
            <StatusPill tone="moss" label={`${monthTotals.savingsRate.toFixed(1)}% ${t.savingsRate}`} />
          </div>
        </header>

        {(isLoading || dataError) && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${dataError ? "border-coral/25 bg-coral/10 text-coral" : "border-river/20 bg-river/10 text-river"}`}>
            {dataError || "Loading Supabase data..."}
          </div>
        )}

        <section id="dashboard" className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={ArrowDownCircle} label={t.monthIncome} value={currency.format(monthTotals.income)} sub={`${comparison.incomeDelta.toFixed(1)}% ${t.vsLastMonth}`} tone="moss" />
            <MetricCard icon={ArrowUpCircle} label={t.monthExpenses} value={currency.format(monthTotals.expenses)} sub={`${comparison.expenseDelta.toFixed(1)}% ${t.vsLastMonth}`} tone="coral" />
            <MetricCard icon={PiggyBank} label={t.netCashFlow} value={currency.format(monthTotals.net)} sub={`${currency.format(allTotals.net)} ${t.allTimeNet}`} tone="plum" />
            <MetricCard icon={Banknote} label={t.accountBalance} value={currency.format(balances.reduce((sum, account) => sum + account.balance, 0))} sub={`${balances.length} ${t.activeAccounts}`} tone="river" />
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1.55fr_1fr]">
            <Panel title={t.spendingPace} action={t.dailyExpenseTrend}>
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily}>
                    <defs>
                      <linearGradient id="spentGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#3d7485" stopOpacity={0.55} />
                        <stop offset="95%" stopColor="#3d7485" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,32,28,0.1)" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} width={48} />
                    <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} />
                    <Area type="monotone" dataKey="spent" stroke="#3d7485" fill="url(#spentGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title={t.categoryMix} action={t.currentMonth}>
              <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie innerRadius={45} outerRadius={70} paddingAngle={3} data={budgetRows.filter((row) => row.spent > 0)} dataKey="spent">
                        {budgetRows.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {budgetRows.slice(0, 5).map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ background: row.color }} />
                        {categoryLabel(row.name)}
                      </span>
                      <strong>{currency.format(row.spent)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </section>

        <section className="mt-4 grid gap-4 2xl:grid-cols-[1fr_0.95fr]">
          <Panel id="transactions" title={t.transactions} action={`${filteredTransactions.length} ${t.entries}`}>
            <div className="mb-4 grid gap-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-11 w-full rounded-lg border border-ink/10 bg-white pl-10 pr-3 text-sm"
                  placeholder={t.searchPlaceholder}
                />
              </label>
              <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[110px_110px_140px_140px_minmax(170px,1fr)_145px_auto]">
                <select value={type} onChange={(event) => setType(event.target.value as TransactionType)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                  <option value="expense">{t.expense}</option>
                  <option value="income">{t.income}</option>
                </select>
                <input value={amount} onChange={(event) => setAmount(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder={t.amount} />
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                  {categories.filter((category) => category.kind === type).map((category) => (
                    <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
                  ))}
                </select>
                <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
                <input value={merchant} onChange={(event) => setMerchant(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" placeholder={t.merchant} />
                <input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
                <button disabled={!canAddTransaction} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-45">
                  <Plus size={17} />
                  {isSaving ? "Saving" : t.add}
                </button>
                <input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2 lg:col-span-full" placeholder={t.optionalNote} />
              </form>
            </div>

            <div className="grid gap-3 lg:hidden">
              {filteredTransactions.slice(0, 14).map((tx) => {
                const category = categories.find((item) => item.id === tx.categoryId);
                const account = accounts.find((item) => item.id === tx.accountId);
                return (
                  <article key={tx.id} className="rounded-lg border border-ink/10 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{tx.merchant}</p>
                        <p className="mt-1 text-sm text-ink/55">{format(parseISO(tx.occurredOn), "MMM d")} - {account?.name}</p>
                      </div>
                      <strong className={`shrink-0 text-right ${tx.type === "income" ? "text-moss" : "text-coral"}`}>
                        {tx.type === "income" ? "+" : "-"}{preciseCurrency.format(tx.amount)}
                      </strong>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: category?.color }} />
                        <span className="truncate">{categoryLabel(category?.name)}</span>
                      </span>
                      <button aria-label="Delete transaction" onClick={() => deleteTransaction(tx.id)} className="inline-grid size-9 shrink-0 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-ink/50">
                    <th className="border-b border-ink/10 py-3 font-semibold">{t.date}</th>
                    <th className="border-b border-ink/10 py-3 font-semibold">{t.merchant}</th>
                    <th className="border-b border-ink/10 py-3 font-semibold">{t.category}</th>
                    <th className="border-b border-ink/10 py-3 font-semibold">{t.account}</th>
                    <th className="border-b border-ink/10 py-3 text-right font-semibold">{t.amount}</th>
                    <th className="border-b border-ink/10 py-3 text-right font-semibold">{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, 14).map((tx) => {
                    const category = categories.find((item) => item.id === tx.categoryId);
                    const account = accounts.find((item) => item.id === tx.accountId);
                    return (
                      <tr key={tx.id} className="group">
                        <td className="border-b border-ink/5 py-3 text-ink/65">{format(parseISO(tx.occurredOn), "MMM d")}</td>
                        <td className="border-b border-ink/5 py-3 font-medium">{tx.merchant}</td>
                        <td className="border-b border-ink/5 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ background: category?.color }} />
                            {categoryLabel(category?.name)}
                          </span>
                        </td>
                        <td className="border-b border-ink/5 py-3 text-ink/65">{account?.name}</td>
                        <td className={`border-b border-ink/5 py-3 text-right font-semibold ${tx.type === "income" ? "text-moss" : "text-coral"}`}>
                          {tx.type === "income" ? "+" : "-"}{preciseCurrency.format(tx.amount)}
                        </td>
                        <td className="border-b border-ink/5 py-3 text-right">
                          <button aria-label="Delete transaction" onClick={() => deleteTransaction(tx.id)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-4">
            <Panel id="budgets" title={t.budgetHealth} action={t.monthlyLimits}>
              <div className="space-y-4">
                {budgetRows.map((row) => (
                  <div key={row.id}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                      <span className="font-medium">{categoryLabel(row.name)}</span>
                      <span className={row.spent > (row.monthlyBudget ?? 0) ? "font-semibold text-coral" : "text-ink/60"}>
                        {currency.format(row.spent)} / {currency.format(row.monthlyBudget ?? 0)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(row.progress, 100)}%`, background: row.spent > (row.monthlyBudget ?? Infinity) ? "#bd5b4b" : row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel id="recurring" title={t.recurring} action={`${upcoming.length} ${t.rules}`}>
              <div className="space-y-3">
                {upcoming.map((rule) => {
                  const category = categories.find((item) => item.id === rule.categoryId);
                  return (
                    <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-white px-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{rule.merchant}</p>
                        <p className="break-words text-sm text-ink/55">{categoryLabel(category?.name)} - {frequencyLabel(rule.frequency)} - {t.dueIn} {rule.daysUntilDue}</p>
                      </div>
                      <strong className={`shrink-0 ${rule.type === "income" ? "text-moss" : "text-coral"}`}>{currency.format(rule.amount)}</strong>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-3">
          <Panel id="goals" title={t.goals} action={t.savingsProgress}>
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id}>
                  <div className="mb-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-ink/60">{currency.format(goal.currentAmount)} / {currency.format(goal.targetAmount)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
                    <div className="h-full rounded-full" style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%`, background: goal.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel id="reports" title={t.reports} action={t.weekdayPattern}>
            <div className="h-52 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekday}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,32,28,0.1)" />
                  <XAxis dataKey="weekday" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} width={44} />
                  <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} />
                  <Bar dataKey="spent" fill="#c3833d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel id="settings" title={t.accounts} action={t.balances}>
            <div className="space-y-3">
              {balances.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-white px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg text-white" style={{ background: account.color }}>
                      <Home size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{account.name}</p>
                      <p className="text-xs uppercase text-ink/45">{account.type.replace("_", " ")}</p>
                    </div>
                  </div>
                  <strong className="shrink-0">{currency.format(account.balance)}</strong>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function Panel({
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
    <section id={id} className="rounded-lg border border-ink/10 bg-paper/78 p-3 shadow-soft backdrop-blur sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        <span className="text-sm text-ink/55">{action}</span>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone
}: {
  icon: typeof BadgeDollarSign;
  label: string;
  value: string;
  sub: string;
  tone: "moss" | "river" | "plum" | "coral";
}) {
  const tones = {
    moss: "bg-moss/12 text-moss",
    river: "bg-river/12 text-river",
    plum: "bg-plum/12 text-plum",
    coral: "bg-coral/12 text-coral"
  };

  return (
    <article className="rounded-lg border border-ink/10 bg-paper/78 p-3 shadow-soft backdrop-blur sm:p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className={`grid size-10 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={20} />
        </span>
        <span className="text-xs font-medium uppercase tracking-normal text-ink/45">{label}</span>
      </div>
      <p className="text-xl font-semibold sm:text-2xl">{value}</p>
      <p className="mt-1 text-sm text-ink/55">{sub}</p>
    </article>
  );
}

function LanguageToggle({
  language,
  onChange,
  label
}: {
  language: Language;
  onChange: (language: Language) => void;
  label: string;
}) {
  return (
    <div className="inline-flex h-10 items-center gap-1 rounded-lg border border-ink/10 bg-white p-1" aria-label={label}>
      <span className="grid size-8 place-items-center text-ink/50">
        <Languages size={17} />
      </span>
      {(["en", "my"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
            language === item ? "bg-ink text-paper" : "text-ink/55 hover:bg-ink/5 hover:text-ink"
          }`}
        >
          {item === "en" ? "EN" : "မြန်မာ"}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "moss" | "river" }) {
  const toneClass = tone === "moss" ? "border-moss/20 bg-moss/10 text-moss" : "border-river/20 bg-river/10 text-river";
  return <span className={`rounded-lg border px-3 py-2 text-sm font-semibold ${toneClass}`}>{label}</span>;
}
