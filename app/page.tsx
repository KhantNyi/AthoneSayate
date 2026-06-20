"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Languages,
  LayoutDashboard,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Target,
  Trash2,
  WalletCards,
  X
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
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import {
  archiveAccount,
  archiveCategory,
  archiveGoal,
  archiveRecurringRule,
  archiveSubcategory,
  createCategory,
  createGoal,
  createRecurringRule,
  createSubcategory,
  createTransaction,
  fetchExpenseData,
  removeMonthlyBudget,
  removeTransaction,
  updateAccount,
  updateCategory,
  updateCategoryBudget,
  updateTransaction,
  updateGoal,
  upsertMonthlyBudget,
  updateRecurringRule,
  updateSubcategory
} from "@/lib/supabase-data";
import {
  accountBalances,
  categorySpend,
  currency,
  dailySeries,
  monthTransactions,
  preciseCurrency,
  safeToSpend,
  totals,
  upcomingRules,
  weekdaySpend
} from "@/lib/metrics";
import type { Account, AccountType, Budget, Category, Goal, RecurringRule, Subcategory, Transaction, TransactionType } from "@/lib/types";

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
    avgDay: "Avg/day",
    balances: "Balances",
    budgetHealth: "Budget health",
    budgets: "Budgets",
    category: "Category",
    categories: "Categories",
    categoryMix: "Category mix",
    clear: "Clear",
    currentMonth: "Current month",
    dashboard: "Dashboard",
    dailyExpenseTrend: "Daily expense trend",
    date: "Date",
    due: "Due",
    dueItems: "Due items",
    dueThisMonth: "Due this month",
    dueIn: "due in",
    entries: "entries",
    expense: "Expense",
    expenseTracker: "Expense tracker",
    goals: "Goals",
    income: "Income",
    language: "Language",
    merchant: "Merchant",
    month: "Month",
    monthExpenses: "Month expenses",
    monthIncome: "Month income",
    monthIncomeShort: "Month income",
    monthSpent: "Month spent",
    monthlyActivity: "Monthly activity",
    monthlyLimits: "Monthly limits",
    netCashFlow: "Net cash flow",
    noExpenseTransactions: "No expense transactions this month.",
    noSpendingRecorded: "No spending recorded this month.",
    none: "None",
    optionalNote: "Optional note",
    pickDayToFilter: "Pick a day to filter the records below",
    personalFinanceCockpit: "Personal finance cockpit",
    recurring: "Recurring",
    recurringDue: "Recurring due",
    reports: "Reports",
    rules: "rules",
    safeToSpendDay: "safe to spend/day",
    savingsProgress: "Savings progress",
    savingsRate: "savings rate",
    scanActivityMonth: "Scan activity across the month",
    searchPlaceholder: "Search note, category, subcategory, account",
    selectedDay: "Selected day",
    selectedWeek: "Selected week",
    settings: "Settings",
    snapshot: "May 2026 snapshot",
    spendingPace: "Spending pace",
    spending: "Spending",
    topSpendingDrivers: "Top spending drivers",
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

const uiTranslations = {
  en: {
    activityCalendar: "Activity calendar",
    avgDay: "Avg/day",
    categories: "Categories",
    clear: "Clear",
    due: "Due",
    dueItems: "Due items",
    dueThisMonth: "Due this month",
    incomeLegend: "Income",
    month: "Month",
    monthIncome: "Month income",
    monthSpent: "Month spent",
    monthlyActivity: "Monthly activity",
    noExpenseTransactions: "No expense transactions this month.",
    noSpendingRecorded: "No spending recorded this month.",
    none: "None",
    pickDayToFilter: "Pick a day to filter the records below",
    recurringDue: "Recurring due",
    scanActivityMonth: "Scan activity across the month",
    selectedDay: "Selected day",
    selectedWeek: "Selected week",
    spending: "Spending",
    topSpendingDrivers: "Top spending drivers",
    transactions: "Transactions"
  },
  my: {
    activityCalendar: "လှုပ်ရှားမှု ပြက္ခဒိန်",
    avgDay: "နေ့စဉ်ပျမ်းမျှ",
    categories: "အမျိုးအစားများ",
    clear: "ရှင်းမည်",
    due: "ပေးရန်",
    dueItems: "ပေးရန်များ",
    dueThisMonth: "ဒီလ ပေးရန်",
    incomeLegend: "ဝင်ငွေ",
    month: "လ",
    monthIncome: "လဝင်ငွေ",
    monthSpent: "လသုံးငွေ",
    monthlyActivity: "လစဉ်လှုပ်ရှားမှု",
    noExpenseTransactions: "ဒီလ သုံးငွေမှတ်တမ်း မရှိသေးပါ",
    noSpendingRecorded: "ဒီလ သုံးငွေ မရှိသေးပါ",
    none: "မရှိပါ",
    pickDayToFilter: "အောက်ကစာရင်းကို စစ်ရန် နေ့ရွေးပါ",
    recurringDue: "ပုံမှန်ပေးရန်",
    scanActivityMonth: "တစ်လတာ လှုပ်ရှားမှုကို ကြည့်ပါ",
    selectedDay: "ရွေးထားသောနေ့",
    selectedWeek: "ရွေးထားသောပတ်",
    spending: "သုံးငွေ",
    topSpendingDrivers: "အများဆုံး သုံးငွေများ",
    transactions: "မှတ်တမ်းများ"
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
  { key: "reports", label: "reports", icon: WalletCards },
  { key: "budgets", label: "budgets", icon: CircleDollarSign },
  { key: "recurring", label: "recurring", icon: CalendarClock },
  { key: "goals", label: "goals", icon: Target },
  { key: "settings", label: "category", icon: Settings }
] as const;

const categoryDisplayColors = [
  "#2563eb",
  "#f97316",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#65a30d",
  "#4f46e5",
  "#ea580c",
  "#059669"
];

type TabKey = (typeof navItems)[number]["key"];

type RecurringDraft = {
  accountId: string;
  categoryId: string;
  subcategoryId: string;
  type: TransactionType;
  amount: string;
  merchant: string;
  frequency: RecurringRule["frequency"];
  nextDueOn: string;
  autoCreate: boolean;
};

type GoalDraft = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
};

type TransactionDraft = {
  accountId: string;
  categoryId: string;
  subcategoryId: string;
  type: TransactionType;
  amount: string;
  occurredOn: string;
  notes: string;
};

type CalendarDaySummary = {
  income?: number;
  expense?: number;
  count?: number;
  dueAmount?: number;
  recurringCount?: number;
  paidAmount?: number;
  paidRecurringCount?: number;
};

type LastRecurringPayment = {
  transaction: Transaction;
  previousRule: RecurringRule;
  updatedRule: RecurringRule;
  notice: string;
};

type AccountDraft = {
  name: string;
  type: AccountType;
  openingBalance: string;
  color: string;
};

export default function ExpenseTrackerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [language, setLanguage] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [dataNotice, setDataNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingBudgetId, setSavingBudgetId] = useState("");
  const [savingGoalId, setSavingGoalId] = useState("");
  const [savingRecurringId, setSavingRecurringId] = useState("");
  const [savingAccountId, setSavingAccountId] = useState("");
  const [savingTransactionId, setSavingTransactionId] = useState("");
  const [undoingRecurringPaymentId, setUndoingRecurringPaymentId] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState("");
  const [editingRecurringId, setEditingRecurringId] = useState("");
  const [editingGoalId, setEditingGoalId] = useState("");
  const [editingAccountId, setEditingAccountId] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()));
  const [dashboardStatsMonth, setDashboardStatsMonth] = useState(startOfMonth(new Date()));
  const [dashboardPaceMonth, setDashboardPaceMonth] = useState(startOfMonth(new Date()));
  const [dashboardCategoryMonth, setDashboardCategoryMonth] = useState(startOfMonth(new Date()));
  const [dashboardCalendarMonth, setDashboardCalendarMonth] = useState(startOfMonth(new Date()));
  const [dashboardConcentrationMonth, setDashboardConcentrationMonth] = useState(startOfMonth(new Date()));
  const [dashboardWeekdayMonth, setDashboardWeekdayMonth] = useState(startOfMonth(new Date()));
  const [dashboardCashflowMonth, setDashboardCashflowMonth] = useState(startOfMonth(new Date()));
  const [monthlyReportMonth, setMonthlyReportMonth] = useState(startOfMonth(new Date()));
  const [monthlyReportMode, setMonthlyReportMode] = useState<"overview" | "compare">("overview");
  const [monthlyCompareMonth, setMonthlyCompareMonth] = useState(startOfMonth(subMonths(new Date(), 1)));
  const [monthlyReportCategoryId, setMonthlyReportCategoryId] = useState("all");
  const [monthlyReportSubcategoryId, setMonthlyReportSubcategoryId] = useState("all");
  const [monthlyReportAccountId, setMonthlyReportAccountId] = useState("all");
  const [monthlyReportRecurringFilter, setMonthlyReportRecurringFilter] = useState<"all" | "recurring" | "manual">("all");
  const [monthlyReportQuery, setMonthlyReportQuery] = useState("");
  const [selectedTransactionDate, setSelectedTransactionDate] = useState("");
  const [selectedRecurringDate, setSelectedRecurringDate] = useState("");
  const [selectedDashboardDate, setSelectedDashboardDate] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [occurredOn, setOccurredOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryKind, setNewCategoryKind] = useState<TransactionType>("expense");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryCategoryId, setNewSubcategoryCategoryId] = useState("");
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetMonth, setBudgetMonth] = useState(format(new Date(), "yyyy-MM"));
  const [recurringType, setRecurringType] = useState<TransactionType>("expense");
  const [recurringAccountId, setRecurringAccountId] = useState("");
  const [recurringCategoryId, setRecurringCategoryId] = useState("");
  const [recurringSubcategoryId, setRecurringSubcategoryId] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringName, setRecurringName] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringRule["frequency"]>("monthly");
  const [recurringNextDueOn, setRecurringNextDueOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recurringAutoCreate, setRecurringAutoCreate] = useState(false);
  const [recurringDrafts, setRecurringDrafts] = useState<Record<string, RecurringDraft>>({});
  const [goalName, setGoalName] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalCurrentAmount, setGoalCurrentAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalDrafts, setGoalDrafts] = useState<Record<string, GoalDraft>>({});
  const [accountDrafts, setAccountDrafts] = useState<Record<string, AccountDraft>>({});
  const [transactionDrafts, setTransactionDrafts] = useState<Record<string, TransactionDraft>>({});
  const [lastRecurringPayment, setLastRecurringPayment] = useState<LastRecurringPayment | null>(null);

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
        setAccountDrafts(Object.fromEntries(data.accounts.map((account) => [account.id, accountToDraft(account)])));
        setBudgets(data.budgets);
        setCategories(data.categories);
        setSubcategories(data.subcategories);
        setGoals(data.goals);
        setRecurringRules(data.recurringRules);
        setTransactions(data.transactions);
        setTransactionDrafts(Object.fromEntries(data.transactions.map((transaction) => [transaction.id, transactionToDraft(transaction)])));
        setAccountId(data.accounts[0]?.id ?? "");
        setCategoryId(data.categories.find((category) => category.kind === "expense")?.id ?? "");
        setNewSubcategoryCategoryId(data.categories.find((category) => category.kind === "expense")?.id ?? "");
        setBudgetDrafts(Object.fromEntries(data.categories.filter((category) => category.kind === "expense").map((category) => {
          const month = format(new Date(), "yyyy-MM");
          const budget = data.budgets.find((item) => item.categoryId === category.id && item.month.startsWith(month));
          return [category.id, String(budget?.amount ?? category.monthlyBudget ?? "")];
        })));
        setBudgetCategoryId(data.categories.find((category) => category.kind === "expense")?.id ?? "");
        setBudgetAmount(String(data.budgets.find((budget) => budget.categoryId === data.categories.find((category) => category.kind === "expense")?.id && budget.month.startsWith(format(new Date(), "yyyy-MM")))?.amount ?? data.categories.find((category) => category.kind === "expense")?.monthlyBudget ?? ""));
        setRecurringAccountId(data.accounts[0]?.id ?? "");
        setRecurringCategoryId(data.categories.find((category) => category.kind === "expense")?.id ?? "");
        setRecurringDrafts(Object.fromEntries(data.recurringRules.map((rule) => [rule.id, recurringRuleToDraft(rule)])));
        setGoalDrafts(Object.fromEntries(data.goals.map((goal) => [goal.id, goalToDraft(goal)])));
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

  useEffect(() => {
    const categorySubcategories = subcategories.filter((item) => item.categoryId === categoryId);

    if (!categorySubcategories.some((item) => item.id === subcategoryId)) {
      setSubcategoryId(categorySubcategories[0]?.id ?? "");
    }
  }, [categoryId, subcategories, subcategoryId]);

  useEffect(() => {
    const currentCategory = categories.find((category) => category.id === recurringCategoryId);

    if (currentCategory?.kind !== recurringType) {
      setRecurringCategoryId(categories.find((category) => category.kind === recurringType)?.id ?? "");
    }
  }, [categories, recurringCategoryId, recurringType]);

  useEffect(() => {
    const categorySubcategories = subcategories.filter((item) => item.categoryId === recurringCategoryId);

    if (!categorySubcategories.some((item) => item.id === recurringSubcategoryId)) {
      setRecurringSubcategoryId(categorySubcategories[0]?.id ?? "");
    }
  }, [recurringCategoryId, recurringSubcategoryId, subcategories]);

  useEffect(() => {
    const selectedBudgetCategory = categories.find((category) => category.id === budgetCategoryId);
    const selectedBudget = budgets.find((budget) => budget.categoryId === budgetCategoryId && budget.month.startsWith(budgetMonth));
    setBudgetAmount(String(selectedBudget?.amount ?? selectedBudgetCategory?.monthlyBudget ?? ""));
  }, [budgetCategoryId, budgetMonth, budgets, categories]);

  useEffect(() => {
    setBudgetDrafts(Object.fromEntries(categories.filter((category) => category.kind === "expense").map((category) => {
      const budget = budgets.find((item) => item.categoryId === category.id && item.month.startsWith(budgetMonth));
      return [category.id, String(budget?.amount ?? category.monthlyBudget ?? "")];
    })));
  }, [budgetMonth, budgets, categories]);

  useEffect(() => {
    setBudgetMonth(format(visibleMonth, "yyyy-MM"));
  }, [visibleMonth]);

  const visibleMonthKey = format(visibleMonth, "yyyy-MM");
  const dashboardCategoryMonthKey = format(dashboardCategoryMonth, "yyyy-MM");
  const dashboardCalendarMonthKey = format(dashboardCalendarMonth, "yyyy-MM");
  const monthlyReportMonthKey = format(monthlyReportMonth, "yyyy-MM");
  const currentMonthTx = useMemo(() => monthTransactions(transactions), [transactions]);
  const currentMonthTotals = useMemo(() => totals(currentMonthTx), [currentMonthTx]);
  const dashboardStatsTx = useMemo(() => monthTransactions(transactions, dashboardStatsMonth), [transactions, dashboardStatsMonth]);
  const monthTotals = useMemo(() => totals(dashboardStatsTx), [dashboardStatsTx]);
  const allTotals = useMemo(() => totals(transactions), [transactions]);
  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const displayCategories = useMemo(() => applyCategoryDisplayColors(categories), [categories]);
  const categoriesForCurrentMonth = useMemo(() => applyMonthlyBudgets(displayCategories, budgets, dashboardCategoryMonthKey), [displayCategories, budgets, dashboardCategoryMonthKey]);
  const categoriesForBudgetMonth = useMemo(() => applyMonthlyBudgets(displayCategories, budgets, budgetMonth), [displayCategories, budgets, budgetMonth]);
  const budgetMonthTx = useMemo(() => monthTransactions(transactions, visibleMonth), [transactions, visibleMonth]);
  const dashboardCategoryTx = useMemo(() => monthTransactions(transactions, dashboardCategoryMonth), [transactions, dashboardCategoryMonth]);
  const budgetRows = useMemo(() => categorySpend(categoriesForCurrentMonth, dashboardCategoryTx), [categoriesForCurrentMonth, dashboardCategoryTx]);
  const budgetTabRows = useMemo(() => categorySpend(categoriesForBudgetMonth, budgetMonthTx).filter((row) => row.monthlyBudget !== undefined), [categoriesForBudgetMonth, budgetMonthTx]);
  const reportMonths = useMemo(() => Array.from({ length: 6 }, (_, index) => startOfMonth(subMonths(dashboardCashflowMonth, 5 - index))), [dashboardCashflowMonth]);
  const reportMonthlySeries = useMemo(() => reportMonths.map((month) => {
    const monthTotal = totals(monthTransactions(transactions, month));

    return {
      month: format(month, "MMM"),
      income: monthTotal.income,
      expenses: monthTotal.expenses,
      net: monthTotal.net
    };
  }), [reportMonths, transactions]);
  const reportStartKey = format(reportMonths[0] ?? startOfMonth(new Date()), "yyyy-MM-dd");
  const reportEndKey = format(endOfMonth(reportMonths[reportMonths.length - 1] ?? new Date()), "yyyy-MM-dd");
  const dashboardConcentrationTx = useMemo(() => monthTransactions(transactions, dashboardConcentrationMonth), [transactions, dashboardConcentrationMonth]);
  const dashboardConcentrationTotal = useMemo(() => dashboardConcentrationTx.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0), [dashboardConcentrationTx]);
  const dashboardConcentrationRows = useMemo(() => displayCategories.filter((category) => category.kind === "expense").map((category) => {
    const categoryTransactions = dashboardConcentrationTx.filter((tx) => tx.type === "expense" && tx.categoryId === category.id);
    const spent = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      ...category,
      spent,
      count: categoryTransactions.length,
      share: dashboardConcentrationTotal > 0 ? (spent / dashboardConcentrationTotal) * 100 : 0
    };
  }).filter((row) => row.spent > 0).sort((a, b) => b.spent - a.spent), [dashboardConcentrationTotal, dashboardConcentrationTx, displayCategories]);
  const comparison = useMemo(() => monthlyComparisonForMonth(transactions, dashboardStatsMonth), [transactions, dashboardStatsMonth]);
  const dashboardPaceTx = useMemo(() => monthTransactions(transactions, dashboardPaceMonth), [transactions, dashboardPaceMonth]);
  const daily = useMemo(() => dailySeries(dashboardPaceTx, dashboardPaceMonth), [dashboardPaceTx, dashboardPaceMonth]);
  const dashboardWeekdayTx = useMemo(() => monthTransactions(transactions, dashboardWeekdayMonth), [transactions, dashboardWeekdayMonth]);
  const weekday = useMemo(() => weekdaySpend(dashboardWeekdayTx), [dashboardWeekdayTx]);
  const monthlyReportCategories = useMemo(() => applyMonthlyBudgets(displayCategories, budgets, monthlyReportMonthKey), [displayCategories, budgets, monthlyReportMonthKey]);
  const monthlyReportSubcategories = useMemo(() => subcategories.filter((subcategory) => (
    monthlyReportCategoryId === "all" || subcategory.categoryId === monthlyReportCategoryId
  )), [monthlyReportCategoryId, subcategories]);
  const monthlyReportTx = useMemo(() => monthTransactions(transactions, monthlyReportMonth).filter((tx) => tx.type === "expense"), [transactions, monthlyReportMonth]);
  const monthlyReportFilteredTx = useMemo(() => monthlyReportTx.filter((tx) => {
    const category = displayCategories.find((item) => item.id === tx.categoryId);
    const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
    const account = accounts.find((item) => item.id === tx.accountId);
    const haystack = `${tx.merchant ?? ""} ${tx.notes ?? ""} ${category?.name ?? ""} ${subcategory?.name ?? ""} ${account?.name ?? ""}`.toLowerCase();
    const matchesCategory = monthlyReportCategoryId === "all" || tx.categoryId === monthlyReportCategoryId;
    const matchesSubcategory = monthlyReportSubcategoryId === "all" || tx.subcategoryId === monthlyReportSubcategoryId;
    const matchesAccount = monthlyReportAccountId === "all" || tx.accountId === monthlyReportAccountId;
    const matchesRecurring =
      monthlyReportRecurringFilter === "all" ||
      (monthlyReportRecurringFilter === "recurring" ? Boolean(tx.isRecurring) : !tx.isRecurring);
    const matchesQuery = haystack.includes(monthlyReportQuery.trim().toLowerCase());

    return matchesCategory && matchesSubcategory && matchesAccount && matchesRecurring && matchesQuery;
  }).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)), [accounts, displayCategories, monthlyReportAccountId, monthlyReportCategoryId, monthlyReportQuery, monthlyReportRecurringFilter, monthlyReportSubcategoryId, monthlyReportTx, subcategories]);
  const monthlyReportTotal = useMemo(() => monthlyReportFilteredTx.reduce((sum, tx) => sum + tx.amount, 0), [monthlyReportFilteredTx]);
  const monthlyReportDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(monthlyReportMonth), end: endOfMonth(monthlyReportMonth) }).length, [monthlyReportMonth]);
  const monthlyReportActiveDays = useMemo(() => new Set(monthlyReportFilteredTx.map((tx) => tx.occurredOn)).size, [monthlyReportFilteredTx]);
  const monthlyReportBudgetTotal = useMemo(() => monthlyReportCategories
    .filter((category) => category.kind === "expense" && (monthlyReportCategoryId === "all" || category.id === monthlyReportCategoryId))
    .reduce((sum, category) => sum + (category.monthlyBudget ?? 0), 0), [monthlyReportCategories, monthlyReportCategoryId]);
  const monthlyReportDaily = useMemo(() => dailySeries(monthlyReportFilteredTx, monthlyReportMonth), [monthlyReportFilteredTx, monthlyReportMonth]);
  const monthlyReportCategoryRows = useMemo(() => categorySpend(monthlyReportCategories, monthlyReportFilteredTx).filter((row) => row.spent > 0), [monthlyReportCategories, monthlyReportFilteredTx]);
  const monthlyReportSubcategoryRows = useMemo(() => subcategories.map((subcategory) => {
    const category = displayCategories.find((item) => item.id === subcategory.categoryId);
    const subcategoryTransactions = monthlyReportFilteredTx.filter((tx) => tx.subcategoryId === subcategory.id);
    const spent = subcategoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      id: subcategory.id,
      name: subcategory.name,
      categoryName: category?.name ?? "",
      color: category?.color ?? "#64748b",
      spent,
      count: subcategoryTransactions.length
    };
  }).filter((row) => row.spent > 0).sort((a, b) => b.spent - a.spent), [displayCategories, monthlyReportFilteredTx, subcategories]);
  const monthlyReportAccountRows = useMemo(() => accounts.map((account) => {
    const accountTransactions = monthlyReportFilteredTx.filter((tx) => tx.accountId === account.id);
    const spent = accountTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      ...account,
      spent,
      count: accountTransactions.length
    };
  }).filter((row) => row.spent > 0).sort((a, b) => b.spent - a.spent), [accounts, monthlyReportFilteredTx]);
  const monthlyReportTrendMonths = useMemo(() => Array.from({ length: 6 }, (_, index) => startOfMonth(subMonths(monthlyReportMonth, 5 - index))), [monthlyReportMonth]);
  const monthlyReportTrendSeries = useMemo(() => monthlyReportTrendMonths.map((month) => {
    const monthExpenseTransactions = monthTransactions(transactions, month).filter((tx) => {
      const matchesCategory = monthlyReportCategoryId === "all" || tx.categoryId === monthlyReportCategoryId;
      const matchesAccount = monthlyReportAccountId === "all" || tx.accountId === monthlyReportAccountId;
      const matchesRecurring =
        monthlyReportRecurringFilter === "all" ||
        (monthlyReportRecurringFilter === "recurring" ? Boolean(tx.isRecurring) : !tx.isRecurring);

      return tx.type === "expense" && matchesCategory && matchesAccount && matchesRecurring;
    });

    return {
      month: format(month, "MMM"),
      expenses: monthExpenseTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    };
  }), [monthlyReportAccountId, monthlyReportCategoryId, monthlyReportRecurringFilter, monthlyReportTrendMonths, transactions]);
  const monthlyCompareFilteredTx = useMemo(() => monthTransactions(transactions, monthlyCompareMonth).filter((tx) => {
    const category = displayCategories.find((item) => item.id === tx.categoryId);
    const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
    const account = accounts.find((item) => item.id === tx.accountId);
    const haystack = `${tx.merchant ?? ""} ${tx.notes ?? ""} ${category?.name ?? ""} ${subcategory?.name ?? ""} ${account?.name ?? ""}`.toLowerCase();
    const matchesCategory = monthlyReportCategoryId === "all" || tx.categoryId === monthlyReportCategoryId;
    const matchesSubcategory = monthlyReportSubcategoryId === "all" || tx.subcategoryId === monthlyReportSubcategoryId;
    const matchesAccount = monthlyReportAccountId === "all" || tx.accountId === monthlyReportAccountId;
    const matchesRecurring =
      monthlyReportRecurringFilter === "all" ||
      (monthlyReportRecurringFilter === "recurring" ? Boolean(tx.isRecurring) : !tx.isRecurring);
    const matchesQuery = haystack.includes(monthlyReportQuery.trim().toLowerCase());

    return tx.type === "expense" && matchesCategory && matchesSubcategory && matchesAccount && matchesRecurring && matchesQuery;
  }), [accounts, displayCategories, monthlyCompareMonth, monthlyReportAccountId, monthlyReportCategoryId, monthlyReportQuery, monthlyReportRecurringFilter, monthlyReportSubcategoryId, subcategories, transactions]);
  const monthlyReportComparisonRows = useMemo(() => {
    if (monthlyReportCategoryId === "all") {
      return monthlyReportCategories
        .filter((category) => category.kind === "expense")
        .map((category) => {
          const currentSpent = monthlyReportFilteredTx
            .filter((tx) => tx.categoryId === category.id)
            .reduce((sum, tx) => sum + tx.amount, 0);
          const compareSpent = monthlyCompareFilteredTx
            .filter((tx) => tx.categoryId === category.id)
            .reduce((sum, tx) => sum + tx.amount, 0);

          return {
            id: category.id,
            name: category.name,
            color: category.color,
            currentSpent,
            compareSpent,
            deltaAmount: currentSpent - compareSpent,
            deltaPercent: percentDelta(currentSpent, compareSpent)
          };
        })
        .filter((row) => row.currentSpent > 0 || row.compareSpent > 0)
        .sort((a, b) => Math.max(b.currentSpent, b.compareSpent) - Math.max(a.currentSpent, a.compareSpent));
    }

    const selectedCategoryForReport = monthlyReportCategories.find((category) => category.id === monthlyReportCategoryId);
    const sourceSubcategories = subcategories.filter((subcategory) => (
      subcategory.categoryId === monthlyReportCategoryId &&
      (monthlyReportSubcategoryId === "all" || subcategory.id === monthlyReportSubcategoryId)
    ));
    const rows = sourceSubcategories.map((subcategory) => {
      const currentSpent = monthlyReportFilteredTx
        .filter((tx) => tx.subcategoryId === subcategory.id)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const compareSpent = monthlyCompareFilteredTx
        .filter((tx) => tx.subcategoryId === subcategory.id)
        .reduce((sum, tx) => sum + tx.amount, 0);

      return {
        id: subcategory.id,
        name: subcategory.name,
        color: selectedCategoryForReport?.color ?? "#64748b",
        currentSpent,
        compareSpent,
        deltaAmount: currentSpent - compareSpent,
        deltaPercent: percentDelta(currentSpent, compareSpent)
      };
    });
    const hasUncategorizedSpend = monthlyReportSubcategoryId === "all" && [...monthlyReportFilteredTx, ...monthlyCompareFilteredTx].some((tx) => (
      tx.categoryId === monthlyReportCategoryId && !tx.subcategoryId
    ));

    if (hasUncategorizedSpend) {
      const currentSpent = monthlyReportFilteredTx
        .filter((tx) => tx.categoryId === monthlyReportCategoryId && !tx.subcategoryId)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const compareSpent = monthlyCompareFilteredTx
        .filter((tx) => tx.categoryId === monthlyReportCategoryId && !tx.subcategoryId)
        .reduce((sum, tx) => sum + tx.amount, 0);

      rows.push({
        id: `${monthlyReportCategoryId}-uncategorized`,
        name: "No subcategory",
        color: selectedCategoryForReport?.color ?? "#64748b",
        currentSpent,
        compareSpent,
        deltaAmount: currentSpent - compareSpent,
        deltaPercent: percentDelta(currentSpent, compareSpent)
      });
    }

    return rows
      .filter((row) => row.currentSpent > 0 || row.compareSpent > 0)
      .sort((a, b) => Math.max(b.currentSpent, b.compareSpent) - Math.max(a.currentSpent, a.compareSpent));
  }, [monthlyCompareFilteredTx, monthlyReportCategories, monthlyReportCategoryId, monthlyReportFilteredTx, monthlyReportSubcategoryId, subcategories]);
  const monthlyComparisonCurrentTotal = useMemo(() => monthlyReportComparisonRows.reduce((sum, row) => sum + row.currentSpent, 0), [monthlyReportComparisonRows]);
  const monthlyComparisonCompareTotal = useMemo(() => monthlyReportComparisonRows.reduce((sum, row) => sum + row.compareSpent, 0), [monthlyReportComparisonRows]);
  const monthlyComparisonDelta = monthlyComparisonCurrentTotal - monthlyComparisonCompareTotal;
  const monthlyComparisonDeltaPercent = percentDelta(monthlyComparisonCurrentTotal, monthlyComparisonCompareTotal);
  const monthlyComparisonMaxSpend = Math.max(...monthlyReportComparisonRows.map((row) => Math.max(row.currentSpent, row.compareSpent)), 1);
  const upcoming = useMemo(() => upcomingRules(recurringRules), [recurringRules]);
  const recurringPayments = useMemo(() => upcoming.reduce<Record<string, Transaction | undefined>>((matches, rule) => ({
    ...matches,
    [rule.id]: findRecurringPayment(rule, transactions)
  }), {}), [transactions, upcoming]);
  const recurringDue = upcoming.filter((rule) => rule.type === "expense" && !recurringPayments[rule.id] && parseISO(rule.nextDueOn) <= endOfMonth(new Date())).reduce((sum, rule) => sum + rule.amount, 0);
  const dailyAllowance = safeToSpend(currentMonthTotals.income, currentMonthTotals.expenses, recurringDue);
  const t = translations[language];
  const ui = uiTranslations[language];
  const categoryLabel = (name?: string) => (language === "my" && name ? categoryTranslations[name] ?? name : name);
  const frequencyLabel = (value: string) => (language === "my" ? frequencyTranslations[value] ?? value : value);
  const selectedCategory = displayCategories.find((category) => category.id === categoryId);
  const selectedSubcategory = subcategories.find((subcategory) => subcategory.id === subcategoryId);
  const canAddTransaction = Boolean(accountId && categoryId && Number(amount) > 0 && !isSaving);
  const transactionCalendarDays = useMemo(() => summarizeTransactionsByDay(transactions.filter((tx) => tx.occurredOn.startsWith(visibleMonthKey))), [transactions, visibleMonthKey]);
  const visibleRecurringPayments = useMemo(() => upcoming.reduce<Record<string, Transaction | undefined>>((matches, rule) => ({
    ...matches,
    [rule.id]: findRecurringPayment(rule, transactions, visibleMonth)
  }), {}), [transactions, upcoming, visibleMonth]);
  const recurringCalendarDays = useMemo(() => summarizeRecurringCalendarByDay(upcoming, transactions, visibleRecurringPayments, visibleMonthKey), [transactions, upcoming, visibleMonthKey, visibleRecurringPayments]);
  const dashboardCalendarTransactionDays = useMemo(() => summarizeTransactionsByDay(transactions.filter((tx) => tx.occurredOn.startsWith(dashboardCalendarMonthKey))), [transactions, dashboardCalendarMonthKey]);
  const dashboardCalendarRecurringDays = useMemo(() => summarizeRecurringByDay(recurringRules.filter((rule) => rule.nextDueOn.startsWith(dashboardCalendarMonthKey))), [recurringRules, dashboardCalendarMonthKey]);
  const dashboardCalendarDays = useMemo(() => mergeCalendarSummaries(dashboardCalendarTransactionDays, dashboardCalendarRecurringDays), [dashboardCalendarTransactionDays, dashboardCalendarRecurringDays]);
  const dashboardSelectedSummary = selectedDashboardDate ? dashboardCalendarDays[selectedDashboardDate] : undefined;
  const dashboardMonthSummary = useMemo(() => summarizeActivityRange(transactions, recurringRules, startOfMonth(dashboardCalendarMonth), endOfMonth(dashboardCalendarMonth)), [transactions, recurringRules, dashboardCalendarMonth]);
  const dashboardWeekSummary = useMemo(() => {
    const selectedDay = selectedDashboardDate ? parseISO(selectedDashboardDate) : new Date();
    return summarizeActivityRange(transactions, recurringRules, startOfWeek(selectedDay), endOfWeek(selectedDay));
  }, [transactions, recurringRules, selectedDashboardDate]);
  const filteredTransactions = transactions
    .filter((tx) => {
      const category = displayCategories.find((item) => item.id === tx.categoryId);
      const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
      const account = accounts.find((item) => item.id === tx.accountId);
      const haystack = `${tx.merchant ?? ""} ${tx.notes ?? ""} ${category?.name ?? ""} ${subcategory?.name ?? ""} ${account?.name ?? ""}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesDate = selectedTransactionDate ? tx.occurredOn === selectedTransactionDate : true;
      return matchesQuery && matchesDate;
    })
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

  function changeMonthlyReportMonth(month: Date) {
    const previousDefault = subMonths(monthlyReportMonth, 1);
    setMonthlyReportMonth(month);
    setMonthlyCompareMonth((current) => (isSameMonth(current, previousDefault) ? subMonths(month, 1) : current));
  }

  function openMonthlyCategoryReport(categoryId: string, month: Date) {
    setMonthlyReportMonth(month);
    setMonthlyCompareMonth(subMonths(month, 1));
    setMonthlyReportMode("compare");
    setMonthlyReportCategoryId(categoryId);
    setMonthlyReportSubcategoryId("all");
    setMonthlyReportAccountId("all");
    setMonthlyReportRecurringFilter("all");
    setMonthlyReportQuery("");
    setActiveTab("reports");
    window.requestAnimationFrame(() => document.getElementById("reports")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function clearMonthlyReportFilters() {
    setMonthlyReportCategoryId("all");
    setMonthlyReportSubcategoryId("all");
    setMonthlyReportAccountId("all");
    setMonthlyReportRecurringFilter("all");
    setMonthlyReportQuery("");
  }

  const displayedRecurringRules = upcoming.filter((rule) => selectedRecurringDate ? rule.nextDueOn === selectedRecurringDate || visibleRecurringPayments[rule.id]?.occurredOn === selectedRecurringDate : true);
  const recurringDueLabel = (daysUntilDue: number) => {
    const dayLabel = Math.abs(daysUntilDue) === 1 ? "day" : "days";

    if (daysUntilDue < 0) {
      return `overdue by ${Math.abs(daysUntilDue)} ${dayLabel}`;
    }

    if (daysUntilDue === 0) {
      return "due today";
    }

    return `${t.dueIn} ${daysUntilDue} ${dayLabel}`;
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || !categoryId || !accountId) {
      return;
    }

    try {
      setIsSaving(true);
      setDataError("");
      const transaction = await createTransaction({
        accountId,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        type,
        amount: parsedAmount,
        occurredOn,
        merchant: selectedSubcategory?.name ?? selectedCategory?.name ?? "",
        notes: notes.trim()
      });

      setTransactions((current) => [transaction, ...current]);
      setTransactionDrafts((current) => ({ ...current, [transaction.id]: transactionToDraft(transaction) }));
      setAmount("");
      setNotes("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to save transaction.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditingTransaction(transaction: Transaction) {
    setEditingTransactionId(transaction.id);
    setTransactionDrafts((current) => ({ ...current, [transaction.id]: transactionToDraft(transaction) }));
  }

  function cancelEditingTransaction(transaction: Transaction) {
    setEditingTransactionId("");
    setTransactionDrafts((current) => ({ ...current, [transaction.id]: transactionToDraft(transaction) }));
  }

  function startEditingRecurring(rule: RecurringRule) {
    setEditingRecurringId(rule.id);
    setRecurringDrafts((current) => ({ ...current, [rule.id]: recurringRuleToDraft(rule) }));
  }

  function cancelEditingRecurring(rule: RecurringRule) {
    setEditingRecurringId("");
    setRecurringDrafts((current) => ({ ...current, [rule.id]: recurringRuleToDraft(rule) }));
  }

  function startEditingGoal(goal: Goal) {
    setEditingGoalId(goal.id);
    setGoalDrafts((current) => ({ ...current, [goal.id]: goalToDraft(goal) }));
  }

  function cancelEditingGoal(goal: Goal) {
    setEditingGoalId("");
    setGoalDrafts((current) => ({ ...current, [goal.id]: goalToDraft(goal) }));
  }

  function startEditingAccount(account: Account) {
    setEditingAccountId(account.id);
    setAccountDrafts((current) => ({ ...current, [account.id]: accountToDraft(account) }));
  }

  function cancelEditingAccount(account: Account) {
    setEditingAccountId("");
    setAccountDrafts((current) => ({ ...current, [account.id]: accountToDraft(account) }));
  }

  function updateTransactionDraft(transactionId: string, patch: Partial<TransactionDraft>) {
    setTransactionDrafts((current) => {
      const transaction = transactions.find((tx) => tx.id === transactionId);
      const currentDraft = current[transactionId] ?? (transaction ? transactionToDraft(transaction) : undefined);

      if (!currentDraft) {
        return current;
      }

      const nextDraft = { ...currentDraft, ...patch };

      if (patch.type && patch.type !== currentDraft.type) {
        const nextCategory = categories.find((category) => category.kind === patch.type);
        const nextSubcategory = subcategories.find((subcategory) => subcategory.categoryId === nextCategory?.id);
        nextDraft.categoryId = nextCategory?.id ?? "";
        nextDraft.subcategoryId = nextSubcategory?.id ?? "";
      }

      if (patch.categoryId !== undefined && patch.categoryId !== currentDraft.categoryId) {
        nextDraft.subcategoryId = subcategories.find((subcategory) => subcategory.categoryId === patch.categoryId)?.id ?? "";
      }

      return { ...current, [transactionId]: nextDraft };
    });
  }

  async function handleUpdateTransaction(transaction: Transaction, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = transactionDrafts[transaction.id] ?? transactionToDraft(transaction);
    const parsedAmount = Number(draft.amount);
    const draftCategory = categories.find((category) => category.id === draft.categoryId);
    const draftSubcategory = subcategories.find((subcategory) => subcategory.id === draft.subcategoryId);

    if (!parsedAmount || !draft.accountId || !draft.categoryId) {
      setDataError("Transaction needs an account, category, and amount.");
      return;
    }

    try {
      setSavingTransactionId(transaction.id);
      setDataError("");
      const updated = await updateTransaction(transaction.id, {
        accountId: draft.accountId,
        categoryId: draft.categoryId || undefined,
        subcategoryId: draft.subcategoryId || undefined,
        type: draft.type,
        amount: parsedAmount,
        occurredOn: draft.occurredOn,
        merchant: draftSubcategory?.name ?? draftCategory?.name ?? transaction.merchant ?? "",
        notes: draft.notes.trim()
      });

      setTransactions((current) => current.map((tx) => (tx.id === updated.id ? updated : tx)).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)));
      setTransactionDrafts((current) => ({ ...current, [updated.id]: transactionToDraft(updated) }));
      setEditingTransactionId("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update transaction.");
    } finally {
      setSavingTransactionId("");
    }
  }

  async function deleteTransaction(id: string) {
    const previous = transactions;
    const previousDrafts = transactionDrafts;
    setTransactions((current) => current.filter((tx) => tx.id !== id));
    setTransactionDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    try {
      setDataError("");
      await removeTransaction(id);
    } catch (error) {
      setTransactions(previous);
      setTransactionDrafts(previousDrafts);
      setDataError(error instanceof Error ? error.message : "Unable to delete transaction.");
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      return;
    }

    try {
      setDataError("");
      const category = await createCategory({
        name: newCategoryName.trim(),
        kind: newCategoryKind,
        monthlyBudget: Number(newCategoryBudget) || undefined
      });
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      setNewCategoryBudget("");
      setNewSubcategoryCategoryId(category.id);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to create category.");
    }
  }

  async function handleCreateSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSubcategoryName.trim() || !newSubcategoryCategoryId) {
      return;
    }

    try {
      setDataError("");
      const subcategory = await createSubcategory({
        categoryId: newSubcategoryCategoryId,
        name: newSubcategoryName.trim()
      });
      setSubcategories((current) => [...current, subcategory].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSubcategoryName("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to create subcategory.");
    }
  }

  async function handleSaveBudget(event: FormEvent<HTMLFormElement>, categoryIdToUpdate: string) {
    event.preventDefault();
    try {
      setDataError("");
      setDataNotice("");
      setSavingBudgetId(categoryIdToUpdate);
      const draft = budgetDrafts[categoryIdToUpdate]?.trim();
      const parsedBudget = Number(draft);

      if (!draft || !Number.isFinite(parsedBudget) || parsedBudget < 0) {
        setDataError("Budget must be a positive number.");
        return;
      }

      const updated = await upsertMonthlyBudget({
        categoryId: categoryIdToUpdate,
        month: `${budgetMonth}-01`,
        amount: parsedBudget
      });
      const category = categories.find((item) => item.id === categoryIdToUpdate);
      setBudgets((current) => upsertBudgetInState(current, updated));
      setBudgetDrafts((current) => ({ ...current, [updated.categoryId]: String(updated.amount) }));
      if (updated.categoryId === budgetCategoryId) {
        setBudgetAmount(String(updated.amount));
      }
      setEditingBudgetId("");
      setDataNotice(`Budget saved for ${category?.name ?? "category"} in ${budgetMonth}.`);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update budget.");
    } finally {
      setSavingBudgetId("");
    }
  }

  async function handleSetBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!budgetCategoryId) {
      setDataError("Choose a category first.");
      return;
    }

    try {
      setDataError("");
      setDataNotice("");
      setSavingBudgetId(budgetCategoryId);
      const draft = budgetAmount.trim();
      const parsedBudget = Number(draft);

      if (!draft || !Number.isFinite(parsedBudget) || parsedBudget < 0) {
        setDataError("Budget must be a positive number.");
        return;
      }

      const updated = await upsertMonthlyBudget({
        categoryId: budgetCategoryId,
        month: `${budgetMonth}-01`,
        amount: parsedBudget
      });
      const category = categories.find((item) => item.id === budgetCategoryId);
      setBudgets((current) => upsertBudgetInState(current, updated));
      setBudgetDrafts((current) => ({ ...current, [updated.categoryId]: String(updated.amount) }));
      setBudgetAmount(String(updated.amount));
      setDataNotice(`Budget saved for ${category?.name ?? "category"} in ${budgetMonth}.`);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update budget.");
    } finally {
      setSavingBudgetId("");
    }
  }

  async function handleCreateRecurring(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(recurringAmount);
    if (!recurringAccountId || !recurringCategoryId || !recurringName.trim() || !parsedAmount || !recurringNextDueOn) {
      return;
    }

    try {
      setDataError("");
      const rule = await createRecurringRule({
        accountId: recurringAccountId,
        categoryId: recurringCategoryId,
        subcategoryId: recurringSubcategoryId || undefined,
        type: recurringType,
        amount: parsedAmount,
        merchant: recurringName.trim(),
        frequency: recurringFrequency,
        nextDueOn: recurringNextDueOn,
        autoCreate: recurringAutoCreate
      });
      setRecurringRules((current) => [...current, rule]);
      setRecurringDrafts((current) => ({ ...current, [rule.id]: recurringRuleToDraft(rule) }));
      setRecurringAmount("");
      setRecurringName("");
      setRecurringAutoCreate(false);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to create recurring item.");
    }
  }

  async function handleCreateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedTarget = Number(goalTargetAmount);
    const parsedCurrent = Number(goalCurrentAmount) || 0;
    if (!goalName.trim() || !parsedTarget) {
      return;
    }

    try {
      setDataError("");
      const goal = await createGoal({
        name: goalName.trim(),
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        targetDate: goalTargetDate || undefined
      });
      setGoals((current) => [...current, goal]);
      setGoalDrafts((current) => ({ ...current, [goal.id]: goalToDraft(goal) }));
      setGoalName("");
      setGoalTargetAmount("");
      setGoalCurrentAmount("");
      setGoalTargetDate("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to create goal.");
    }
  }

  async function handleUpdateGoal(event: FormEvent<HTMLFormElement>, goalId: string) {
    event.preventDefault();
    const draft = goalDrafts[goalId];
    const parsedTarget = Number(draft?.targetAmount);
    const parsedCurrent = Number(draft?.currentAmount) || 0;

    if (!draft?.name.trim() || !parsedTarget) {
      setDataError("Goal needs a name and target amount.");
      return;
    }

    try {
      setDataError("");
      setSavingGoalId(goalId);
      const updated = await updateGoal(goalId, {
        name: draft.name.trim(),
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        targetDate: draft.targetDate || undefined
      });
      setGoals((current) => current.map((goal) => (goal.id === updated.id ? updated : goal)));
      setGoalDrafts((current) => ({ ...current, [updated.id]: goalToDraft(updated) }));
      setEditingGoalId("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update goal.");
    } finally {
      setSavingGoalId("");
    }
  }

  async function handleDeleteBudget(categoryIdToDelete: string) {
    const category = categories.find((item) => item.id === categoryIdToDelete);
    const categoryBudgets = budgets.filter((item) => item.categoryId === categoryIdToDelete);

    if (!category) {
      return;
    }

    const previousCategories = categories;
    const previousBudgets = budgets;

    setCategories((current) => current.map((item) => item.id === categoryIdToDelete ? { ...item, monthlyBudget: undefined } : item));
    setBudgets((current) => current.filter((item) => item.categoryId !== categoryIdToDelete));
    setBudgetDrafts((current) => {
      const next = { ...current };
      delete next[categoryIdToDelete];
      return next;
    });
    setEditingBudgetId("");

    if (budgetCategoryId === categoryIdToDelete) {
      const nextCategory = categories.find((item) => item.kind === "expense" && item.id !== categoryIdToDelete);
      setBudgetCategoryId(nextCategory?.id ?? "");
      setBudgetAmount("");
    }

    try {
      setDataError("");
      setSavingBudgetId(categoryIdToDelete);
      await Promise.all([
        category.monthlyBudget !== undefined ? updateCategoryBudget(categoryIdToDelete, null) : Promise.resolve(),
        ...categoryBudgets.map((budget) => removeMonthlyBudget(budget.id))
      ]);
      setDataNotice(`${category.name} removed from budgets.`);
    } catch (error) {
      setCategories(previousCategories);
      setBudgets(previousBudgets);
      setDataError(error instanceof Error ? error.message : "Unable to remove budget category.");
    } finally {
      setSavingBudgetId("");
    }
  }

  async function handleUpdateRecurring(event: FormEvent<HTMLFormElement>, ruleId: string) {
    event.preventDefault();
    const draft = recurringDrafts[ruleId];
    const parsedAmount = Number(draft?.amount);

    if (!draft?.accountId || !draft.categoryId || !draft.merchant.trim() || !parsedAmount || !draft.nextDueOn) {
      setDataError("Recurring item needs account, category, name, amount, and next due date.");
      return;
    }

    try {
      setDataError("");
      setSavingRecurringId(ruleId);
      const updated = await updateRecurringRule(ruleId, {
        accountId: draft.accountId,
        categoryId: draft.categoryId,
        subcategoryId: draft.subcategoryId || undefined,
        type: draft.type,
        amount: parsedAmount,
        merchant: draft.merchant.trim(),
        frequency: draft.frequency,
        nextDueOn: draft.nextDueOn,
        autoCreate: draft.autoCreate
      });
      setRecurringRules((current) => current.map((rule) => (rule.id === updated.id ? updated : rule)));
      setRecurringDrafts((current) => ({ ...current, [updated.id]: recurringRuleToDraft(updated) }));
      setEditingRecurringId("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update recurring item.");
    } finally {
      setSavingRecurringId("");
    }
  }

  async function handleMarkRecurringPaid(rule: RecurringRule) {
    if (!rule.categoryId) {
      setDataError("Recurring item needs a category before it can be recorded.");
      return;
    }

    try {
      setDataError("");
      setDataNotice("");
      setSavingRecurringId(rule.id);
      const transaction = await createTransaction({
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        type: rule.type,
        amount: rule.amount,
        occurredOn: format(new Date(), "yyyy-MM-dd"),
        merchant: rule.merchant,
        notes: `Recorded from recurring item due ${rule.nextDueOn}`,
        isRecurring: true
      });
      const updatedRule = await updateRecurringRule(rule.id, {
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        type: rule.type,
        amount: rule.amount,
        merchant: rule.merchant,
        frequency: rule.frequency,
        nextDueOn: nextRecurringDueOn(rule),
        autoCreate: rule.autoCreate
      });

      setTransactions((current) => [transaction, ...current].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)));
      setTransactionDrafts((current) => ({ ...current, [transaction.id]: transactionToDraft(transaction) }));
      setRecurringRules((current) => current.map((item) => (item.id === updatedRule.id ? updatedRule : item)));
      setRecurringDrafts((current) => ({ ...current, [updatedRule.id]: recurringRuleToDraft(updatedRule) }));
      const notice = `${rule.merchant} recorded and moved to ${format(parseISO(updatedRule.nextDueOn), "MMM d")}.`;
      setLastRecurringPayment({ transaction, previousRule: rule, updatedRule, notice });
      setDataNotice(notice);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to record recurring payment.");
    } finally {
      setSavingRecurringId("");
    }
  }

  async function handleUndoRecurringPaid() {
    if (!lastRecurringPayment) {
      return;
    }

    const { previousRule, transaction, updatedRule } = lastRecurringPayment;

    try {
      setDataError("");
      setUndoingRecurringPaymentId(transaction.id);
      await removeTransaction(transaction.id);
      const restoredRule = await updateRecurringRule(previousRule.id, {
        accountId: previousRule.accountId,
        categoryId: previousRule.categoryId,
        subcategoryId: previousRule.subcategoryId,
        type: previousRule.type,
        amount: previousRule.amount,
        merchant: previousRule.merchant,
        frequency: previousRule.frequency,
        nextDueOn: previousRule.nextDueOn,
        autoCreate: previousRule.autoCreate
      });

      setTransactions((current) => current.filter((item) => item.id !== transaction.id));
      setTransactionDrafts((current) => {
        const remaining = { ...current };
        delete remaining[transaction.id];
        return remaining;
      });
      setRecurringRules((current) => current.map((item) => (item.id === updatedRule.id ? restoredRule : item)));
      setRecurringDrafts((current) => ({ ...current, [restoredRule.id]: recurringRuleToDraft(restoredRule) }));
      setLastRecurringPayment(null);
      setDataNotice(`${previousRule.merchant} payment undone and moved back to ${format(parseISO(restoredRule.nextDueOn), "MMM d")}.`);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to undo recurring payment.");
    } finally {
      setUndoingRecurringPaymentId("");
    }
  }

  async function handleDeleteRecurring(ruleId: string) {
    const previous = recurringRules;
    setRecurringRules((current) => current.filter((rule) => rule.id !== ruleId));
    if (editingRecurringId === ruleId) {
      setEditingRecurringId("");
    }

    try {
      setDataError("");
      await archiveRecurringRule(ruleId);
    } catch (error) {
      setRecurringRules(previous);
      setDataError(error instanceof Error ? error.message : "Unable to delete recurring item.");
    }
  }

  async function handleDeleteGoal(goalId: string) {
    const previous = goals;
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
    if (editingGoalId === goalId) {
      setEditingGoalId("");
    }

    try {
      setDataError("");
      await archiveGoal(goalId);
    } catch (error) {
      setGoals(previous);
      setDataError(error instanceof Error ? error.message : "Unable to delete goal.");
    }
  }

  async function handleUpdateCategory(categoryIdToUpdate: string, input: { name: string; kind: TransactionType; monthlyBudget: string }) {
    const parsedBudget = Number(input.monthlyBudget);

    if (!input.name.trim()) {
      setDataError("Category needs a name.");
      return;
    }

    try {
      setDataError("");
      const updated = await updateCategory(categoryIdToUpdate, {
        name: input.name.trim(),
        kind: input.kind,
        monthlyBudget: input.monthlyBudget.trim() ? parsedBudget : undefined
      });
      setCategories((current) => current.map((category) => (category.id === updated.id ? updated : category)).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update category.");
    }
  }

  async function handleDeleteCategory(categoryIdToDelete: string) {
    const previousCategories = categories;
    const previousSubcategories = subcategories;
    setCategories((current) => current.filter((category) => category.id !== categoryIdToDelete));
    setSubcategories((current) => current.filter((subcategory) => subcategory.categoryId !== categoryIdToDelete));

    try {
      setDataError("");
      await archiveCategory(categoryIdToDelete);
    } catch (error) {
      setCategories(previousCategories);
      setSubcategories(previousSubcategories);
      setDataError(error instanceof Error ? error.message : "Unable to delete category.");
    }
  }

  async function handleUpdateSubcategory(subcategoryIdToUpdate: string, input: { categoryId: string; name: string }) {
    if (!input.categoryId || !input.name.trim()) {
      setDataError("Subcategory needs a category and name.");
      return;
    }

    try {
      setDataError("");
      const updated = await updateSubcategory(subcategoryIdToUpdate, {
        categoryId: input.categoryId,
        name: input.name.trim()
      });
      setSubcategories((current) => current.map((subcategory) => (subcategory.id === updated.id ? updated : subcategory)).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update subcategory.");
    }
  }

  async function handleDeleteSubcategory(subcategoryIdToDelete: string) {
    const previous = subcategories;
    setSubcategories((current) => current.filter((subcategory) => subcategory.id !== subcategoryIdToDelete));

    try {
      setDataError("");
      await archiveSubcategory(subcategoryIdToDelete);
    } catch (error) {
      setSubcategories(previous);
      setDataError(error instanceof Error ? error.message : "Unable to delete subcategory.");
    }
  }

  async function handleUpdateAccount(event: FormEvent<HTMLFormElement>, accountIdToUpdate: string) {
    event.preventDefault();
    const draft = accountDrafts[accountIdToUpdate];
    const parsedOpeningBalance = Number(draft?.openingBalance);

    if (!draft?.name.trim() || !Number.isFinite(parsedOpeningBalance)) {
      setDataError("Account needs a name and valid opening balance.");
      return;
    }

    try {
      setDataError("");
      setSavingAccountId(accountIdToUpdate);
      const updated = await updateAccount(accountIdToUpdate, {
        name: draft.name.trim(),
        type: draft.type,
        openingBalance: parsedOpeningBalance,
        color: draft.color || "#2563eb"
      });
      setAccounts((current) => current.map((account) => account.id === updated.id ? updated : account));
      setAccountDrafts((current) => ({ ...current, [updated.id]: accountToDraft(updated) }));
      setEditingAccountId("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update account.");
    } finally {
      setSavingAccountId("");
    }
  }

  async function handleDeleteAccount(accountIdToDelete: string) {
    const previous = accounts;
    const nextAccounts = accounts.filter((account) => account.id !== accountIdToDelete);
    setAccounts(nextAccounts);
    if (editingAccountId === accountIdToDelete) {
      setEditingAccountId("");
    }

    if (accountId === accountIdToDelete) {
      setAccountId(nextAccounts[0]?.id ?? "");
    }

    if (recurringAccountId === accountIdToDelete) {
      setRecurringAccountId(nextAccounts[0]?.id ?? "");
    }

    try {
      setDataError("");
      await archiveAccount(accountIdToDelete);
    } catch (error) {
      setAccounts(previous);
      setDataError(error instanceof Error ? error.message : "Unable to delete account.");
    }
  }

  const renderTransactionEditor = (transaction: Transaction) => {
    const draft = transactionDrafts[transaction.id] ?? transactionToDraft(transaction);
    const canSave = Boolean(draft.accountId && draft.categoryId && Number(draft.amount) > 0 && savingTransactionId !== transaction.id);

    return (
      <form onSubmit={(event) => handleUpdateTransaction(transaction, event)} className="grid gap-2 rounded-lg border border-river/15 bg-river/5 p-3 lg:grid-cols-[110px_110px_140px_140px_minmax(170px,1fr)_145px_auto_auto]">
        <select value={draft.type} onChange={(event) => updateTransactionDraft(transaction.id, { type: event.target.value as TransactionType })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
          <option value="expense">{t.expense}</option>
          <option value="income">{t.income}</option>
        </select>
        <input value={draft.amount} onChange={(event) => updateTransactionDraft(transaction.id, { amount: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder={t.amount} />
        <select value={draft.categoryId} onChange={(event) => updateTransactionDraft(transaction.id, { categoryId: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
          {categories.filter((category) => category.kind === draft.type).map((category) => (
            <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
          ))}
        </select>
        <select value={draft.subcategoryId} onChange={(event) => updateTransactionDraft(transaction.id, { subcategoryId: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
          <option value="">Subcategory</option>
          {subcategories.filter((subcategory) => subcategory.categoryId === draft.categoryId).map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
          ))}
        </select>
        <select value={draft.accountId} onChange={(event) => updateTransactionDraft(transaction.id, { accountId: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{account.name}</option>
          ))}
        </select>
        <input type="date" value={draft.occurredOn} onChange={(event) => updateTransactionDraft(transaction.id, { occurredOn: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
        <button disabled={!canSave} className="inline-flex h-10 items-center justify-center rounded-lg bg-river px-4 text-sm font-semibold text-white transition hover:bg-river/85 disabled:cursor-not-allowed disabled:opacity-45">
          {savingTransactionId === transaction.id ? "Saving" : "Update"}
        </button>
        <button type="button" aria-label="Cancel edit" onClick={() => cancelEditingTransaction(transaction)} className="inline-grid h-10 place-items-center rounded-lg border border-ink/10 bg-white px-3 text-ink/55 transition hover:bg-ink/5 hover:text-ink">
          <X size={16} />
        </button>
        <input value={draft.notes} onChange={(event) => updateTransactionDraft(transaction.id, { notes: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm lg:col-span-full" placeholder={t.optionalNote} />
      </form>
    );
  };

  const renderRecurringEditor = (rule: RecurringRule) => {
    const draft = recurringDrafts[rule.id] ?? recurringRuleToDraft(rule);

    return (
      <form onSubmit={(event) => handleUpdateRecurring(event, rule.id)} className="grid gap-2 rounded-lg border border-river/15 bg-river/5 p-3 sm:grid-cols-2 lg:grid-cols-[110px_110px_minmax(160px,1fr)_140px_140px_130px_130px_auto_auto]">
        <select
          value={draft.type}
          onChange={(event) => {
            const nextType = event.target.value as TransactionType;
            const nextCategoryId = categories.find((category) => category.kind === nextType)?.id ?? "";
            const nextSubcategoryId = subcategories.find((subcategory) => subcategory.categoryId === nextCategoryId)?.id ?? "";
            setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, type: nextType, categoryId: nextCategoryId, subcategoryId: nextSubcategoryId } }));
          }}
          className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm"
        >
          <option value="expense">{t.expense}</option>
          <option value="income">{t.income}</option>
        </select>
        <input value={draft.amount} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, amount: event.target.value } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder={t.amount} />
        <input value={draft.merchant} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, merchant: event.target.value } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" placeholder="Name" />
        <select
          value={draft.categoryId}
          onChange={(event) => {
            const nextCategoryId = event.target.value;
            const nextSubcategoryId = subcategories.find((subcategory) => subcategory.categoryId === nextCategoryId)?.id ?? "";
            setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, categoryId: nextCategoryId, subcategoryId: nextSubcategoryId } }));
          }}
          className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm"
        >
          {categories.filter((category) => category.kind === draft.type).map((category) => (
            <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
          ))}
        </select>
        <select value={draft.subcategoryId} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, subcategoryId: event.target.value } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
          <option value="">No subcategory</option>
          {subcategories.filter((subcategory) => subcategory.categoryId === draft.categoryId).map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
          ))}
        </select>
        <select value={draft.frequency} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, frequency: event.target.value as RecurringRule["frequency"] } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input type="date" value={draft.nextDueOn} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, nextDueOn: event.target.value } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
        <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={savingRecurringId === rule.id}>
          {savingRecurringId === rule.id ? "Saving" : "Update"}
        </button>
        <button type="button" aria-label="Cancel recurring edit" onClick={() => cancelEditingRecurring(rule)} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
          <X size={16} />
        </button>
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink/55 lg:col-span-full">
          <select value={draft.accountId} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, accountId: event.target.value } }))} className="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3">
            <input type="checkbox" checked={draft.autoCreate} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, autoCreate: event.target.checked } }))} />
            Auto-create
          </label>
        </div>
      </form>
    );
  };

  return (
    <main className="min-h-screen pb-20 text-ink xl:pb-0" lang={language === "my" ? "my" : "en"}>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-ink/10 bg-white px-4 py-5 xl:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid size-11 place-items-center rounded-lg bg-river text-white shadow-[0_10px_24px_rgba(37,99,235,0.20)]">
            <WalletCards size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold">athonesayate</p>
            <p className="text-xs text-ink/55">{t.personalFinanceCockpit}</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition ${
                activeTab === item.key ? "bg-river text-white shadow-[0_10px_22px_rgba(37,99,235,0.16)]" : "text-ink/70 hover:bg-white hover:text-river"
              }`}
            >
              <item.icon size={18} />
              {t[item.label]}
            </button>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white px-2 py-2 shadow-[0_-12px_30px_rgba(23,32,28,0.08)] xl:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-1">
          {navItems.filter((item) => ["dashboard", "transactions", "reports", "budgets", "recurring", "settings"].includes(item.key)).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium ${
                activeTab === item.key ? "bg-river text-white shadow-[0_8px_18px_rgba(37,99,235,0.16)]" : "text-ink/65"
              }`}
            >
              <item.icon size={18} />
              <span className="max-w-full truncate">{t[item.label]}</span>
            </button>
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
            <StatusPill tone="moss" label={`${currentMonthTotals.savingsRate.toFixed(1)}% ${t.savingsRate}`} />
          </div>
        </header>

        {(isLoading || dataError || dataNotice) && (
          <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            dataError ? "border-coral/25 bg-coral/10 text-coral" : "border-river/20 bg-river/10 text-river"
          }`}>
            <span>{dataError || dataNotice || "Loading Supabase data..."}</span>
            {!dataError && lastRecurringPayment && dataNotice === lastRecurringPayment.notice ? (
              <button
                type="button"
                onClick={handleUndoRecurringPaid}
                disabled={undoingRecurringPaymentId === lastRecurringPayment.transaction.id}
                className="h-9 rounded-lg border border-river/25 bg-white px-3 text-sm font-semibold text-river transition hover:bg-river/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {undoingRecurringPaymentId === lastRecurringPayment.transaction.id ? "Undoing" : "Undo"}
              </button>
            ) : null}
          </div>
        )}

        <section id="dashboard" className={activeTab === "dashboard" ? "grid gap-4" : "hidden"}>
          <div className="flex justify-end">
            <MonthField label={`${ui.month} - ${t.dashboard}`} month={dashboardStatsMonth} onChange={setDashboardStatsMonth} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={ArrowDownCircle} label={t.monthIncome} value={currency.format(monthTotals.income)} sub={`${comparison.incomeDelta.toFixed(1)}% ${t.vsLastMonth}`} tone="moss" />
            <MetricCard icon={ArrowUpCircle} label={t.monthExpenses} value={currency.format(monthTotals.expenses)} sub={`${comparison.expenseDelta.toFixed(1)}% ${t.vsLastMonth}`} tone="coral" />
            <MetricCard icon={PiggyBank} label={t.netCashFlow} value={currency.format(monthTotals.net)} sub={`${currency.format(allTotals.net)} ${t.allTimeNet}`} tone="river" />
            <MetricCard icon={Banknote} label={t.accountBalance} value={currency.format(balances.reduce((sum, account) => sum + account.balance, 0))} sub={`${balances.length} ${t.activeAccounts}`} tone="river" />
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1.55fr_1fr]">
            <Panel title={t.spendingPace} action={t.dailyExpenseTrend}>
              <div className="mb-3 flex justify-end">
                <MonthField label={ui.month} month={dashboardPaceMonth} onChange={setDashboardPaceMonth} />
              </div>
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily}>
                    <defs>
                      <linearGradient id="spentGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.38} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,32,28,0.1)" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `฿${value}`} width={48} />
                    <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} />
                    <Area type="monotone" dataKey="spent" stroke="#f97316" fill="url(#spentGradient)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title={t.categoryMix} action={format(dashboardCategoryMonth, "MMM yyyy")}>
              <div className="mb-3 flex justify-end">
                <MonthField label={ui.month} month={dashboardCategoryMonth} onChange={setDashboardCategoryMonth} />
              </div>
              <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie innerRadius={45} outerRadius={70} paddingAngle={3} data={budgetRows.filter((row) => row.spent > 0)} dataKey="spent">
                        {budgetRows.filter((row) => row.spent > 0).map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {budgetRows.slice(0, 5).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => openMonthlyCategoryReport(row.id, dashboardCategoryMonth)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-river/10 focus:outline-none focus:ring-2 focus:ring-river/30"
                      aria-label={`View ${categoryLabel(row.name)} expenses for ${format(dashboardCategoryMonth, "MMMM yyyy")}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ background: row.color }} />
                        {categoryLabel(row.name)}
                      </span>
                      <strong>{currency.format(row.spent)}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1fr_1fr]">
            <Panel title={ui.activityCalendar} action={format(dashboardCalendarMonth, "MMM yyyy")}>
              <div className="mb-3 grid gap-2 sm:grid-cols-4">
                <ActivityStat label={ui.monthSpent} value={currency.format(dashboardMonthSummary.expense)} tone="coral" />
                <ActivityStat label={ui.monthIncome} value={currency.format(dashboardMonthSummary.income)} tone="moss" />
                <ActivityStat label="Net" value={currency.format(dashboardMonthSummary.income - dashboardMonthSummary.expense)} tone={dashboardMonthSummary.income - dashboardMonthSummary.expense >= 0 ? "moss" : "coral"} />
                <ActivityStat label={ui.dueThisMonth} value={`${dashboardMonthSummary.recurringCount}`} sub={currency.format(dashboardMonthSummary.dueAmount)} tone="amber" />
              </div>
              <MonthCalendar
                month={dashboardCalendarMonth}
                selectedDate={selectedDashboardDate}
                summaries={dashboardCalendarDays}
                variant="activity"
                labels={ui}
                onMonthChange={(month) => {
                  setDashboardCalendarMonth(month);
                  setSelectedDashboardDate("");
                }}
                onDateSelect={setSelectedDashboardDate}
                onClearDate={() => setSelectedDashboardDate("")}
              />
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-ink/10 bg-ink/[0.025] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-ink/45">{ui.selectedWeek}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <ActivityStat label={ui.spending} value={currency.format(dashboardWeekSummary.expense)} tone="coral" compact />
                    <ActivityStat label={t.income} value={currency.format(dashboardWeekSummary.income)} tone="moss" compact />
                    <ActivityStat label={ui.avgDay} value={currency.format(dashboardWeekSummary.expense / 7)} tone="ink" compact />
                    <ActivityStat label={t.entries} value={`${dashboardWeekSummary.count}`} tone="ink" compact />
                  </div>
                </div>
                <div className="rounded-lg border border-ink/10 bg-ink/[0.025] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-ink/45">{ui.selectedDay}</p>
                  <div className="grid grid-cols-2 gap-2">
                <div>
                      <p className="text-xs uppercase text-ink/45">{t.date}</p>
                  <p className="font-semibold">{selectedDashboardDate ? format(parseISO(selectedDashboardDate), "MMM d") : ui.none}</p>
                </div>
                    <ActivityStat label={ui.spending} value={currency.format(dashboardSelectedSummary?.expense ?? 0)} tone="coral" compact />
                    <ActivityStat label={t.income} value={currency.format(dashboardSelectedSummary?.income ?? 0)} tone="moss" compact />
                    <ActivityStat label={ui.due} value={`${dashboardSelectedSummary?.recurringCount ?? 0}`} tone="amber" compact />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Category concentration" action={format(dashboardConcentrationMonth, "MMM yyyy")}>
              <div className="mb-3 flex justify-end">
                <MonthField label={ui.month} month={dashboardConcentrationMonth} onChange={setDashboardConcentrationMonth} />
              </div>
              <div className="mb-3 text-right text-xs font-semibold text-ink/45">{currency.format(dashboardConcentrationTotal)}</div>
              <div className="space-y-3">
                {dashboardConcentrationRows.slice(0, 6).map((row) => (
                  <div key={row.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                        <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                        <span className="truncate">{categoryLabel(row.name)}</span>
                      </span>
                      <strong>{row.share.toFixed(0)}%</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/10">
                        <div className="h-full rounded-full bg-river" style={{ width: `${Math.min(row.share, 100)}%` }} />
                      </div>
                      <span className="w-24 text-right text-xs text-ink/55">{currency.format(row.spent)}</span>
                    </div>
                  </div>
                ))}
                {dashboardConcentrationRows.length === 0 ? <p className="text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
            <Panel title="6-month cash flow" action={`${format(parseISO(reportStartKey), "MMM yyyy")} - ${format(parseISO(reportEndKey), "MMM yyyy")}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-ink/45">{currency.format(reportMonthlySeries.reduce((sum, item) => sum + item.net, 0))} net</span>
                <MonthField label={`${ui.month} ending`} month={dashboardCashflowMonth} onChange={setDashboardCashflowMonth} />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportMonthlySeries}>
                    <defs>
                      <linearGradient id="reportIncomeGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="reportExpenseGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#f05a3f" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#f05a3f" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,32,28,0.1)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `เธฟ${value}`} width={48} />
                    <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} />
                    <Area type="monotone" dataKey="income" stroke="#16a34a" fill="url(#reportIncomeGradient)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="expenses" stroke="#f05a3f" fill="url(#reportExpenseGradient)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title={t.weekdayPattern} action={format(dashboardWeekdayMonth, "MMM yyyy")}>
              <div className="mb-3 flex justify-end">
                <MonthField label={ui.month} month={dashboardWeekdayMonth} onChange={setDashboardWeekdayMonth} />
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekday}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,32,28,0.1)" />
                    <XAxis dataKey="weekday" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `เธฟ${value}`} width={44} />
                    <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} />
                    <Bar dataKey="spent" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </section>

        <section id="reports" className={activeTab === "reports" ? "mt-4 grid min-w-0 gap-4" : "hidden"}>
          <Panel title="Monthly expense report" action={format(monthlyReportMonth, "MMMM yyyy")}>
            <div className="mb-4 grid min-w-0 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
              <MonthField label={ui.month} month={monthlyReportMonth} onChange={changeMonthlyReportMonth} />
              <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <select
                  value={monthlyReportCategoryId}
                  onChange={(event) => {
                    setMonthlyReportCategoryId(event.target.value);
                    setMonthlyReportSubcategoryId("all");
                  }}
                  className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                  aria-label="Report category"
                >
                  <option value="all">All categories</option>
                  {displayCategories.filter((category) => category.kind === "expense").map((category) => (
                    <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
                  ))}
                </select>
                <select
                  value={monthlyReportSubcategoryId}
                  onChange={(event) => setMonthlyReportSubcategoryId(event.target.value)}
                  className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                  aria-label="Report subcategory"
                >
                  <option value="all">All subcategories</option>
                  {monthlyReportSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                  ))}
                </select>
                <select
                  value={monthlyReportAccountId}
                  onChange={(event) => setMonthlyReportAccountId(event.target.value)}
                  className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                  aria-label="Report account"
                >
                  <option value="all">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
                <select
                  value={monthlyReportRecurringFilter}
                  onChange={(event) => setMonthlyReportRecurringFilter(event.target.value as "all" | "recurring" | "manual")}
                  className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                  aria-label="Report recurring filter"
                >
                  <option value="all">All entries</option>
                  <option value="recurring">Recurring only</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <label className="relative block min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
                <input
                  value={monthlyReportQuery}
                  onChange={(event) => setMonthlyReportQuery(event.target.value)}
                  className="h-10 w-full rounded-lg border border-ink/10 bg-white pl-10 pr-3 text-sm"
                  placeholder="Search merchant, note, category, subcategory, account"
                  aria-label="Search monthly expenses"
                />
              </label>
              <button
                type="button"
                onClick={clearMonthlyReportFilters}
                className="h-10 rounded-lg border border-ink/10 bg-white px-4 text-sm font-semibold text-ink/60 transition hover:bg-ink/[0.04] hover:text-ink"
              >
                Clear filters
              </button>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex h-10 w-full items-center rounded-lg border border-ink/10 bg-white p-1 sm:w-auto">
                {(["overview", "compare"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMonthlyReportMode(mode)}
                    className={`h-8 flex-1 rounded-md px-4 text-sm font-semibold capitalize transition sm:flex-none ${
                      monthlyReportMode === mode ? "bg-river text-white" : "text-ink/55 hover:bg-river/10 hover:text-river"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {monthlyReportMode === "compare" ? (
                <MonthField label="Compare to" month={monthlyCompareMonth} onChange={setMonthlyCompareMonth} />
              ) : null}
            </div>

            {monthlyReportMode === "overview" ? (
              <Fragment>
            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ActivityStat label="Total expenses" value={currency.format(monthlyReportTotal)} tone="coral" />
              <ActivityStat label="Average/day" value={currency.format(monthlyReportTotal / Math.max(monthlyReportDays, 1))} sub={`${monthlyReportActiveDays} active days`} tone="ink" />
              <ActivityStat label="Budget remaining" value={currency.format(Math.max(monthlyReportBudgetTotal - monthlyReportTotal, 0))} sub={`${currency.format(monthlyReportBudgetTotal)} planned`} tone={monthlyReportBudgetTotal >= monthlyReportTotal ? "moss" : "coral"} />
              <ActivityStat label="Transactions" value={`${monthlyReportFilteredTx.length}`} sub={`${monthlyReportCategoryRows.length} categories`} tone="ink" />
            </div>

            <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-semibold uppercase text-ink/55">Daily expenses</h3>
                  <span className="shrink-0 text-xs font-semibold text-ink/45">{format(monthlyReportMonth, "MMM yyyy")}</span>
                </div>
                <div className="h-56 min-w-0 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyReportDaily} margin={{ bottom: 4, left: -18, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="monthlyReportDailyGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#f05a3f" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#f05a3f" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,32,28,0.1)" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrency(Number(value))} width={52} />
                      <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} />
                      <Area type="monotone" dataKey="spent" stroke="#f05a3f" fill="url(#monthlyReportDailyGradient)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-semibold uppercase text-ink/55">6-month expense trend</h3>
                  <span className="shrink-0 text-xs font-semibold text-ink/45">{currency.format(monthlyReportTrendSeries.reduce((sum, item) => sum + item.expenses, 0))}</span>
                </div>
                <div className="h-56 min-w-0 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyReportTrendSeries} margin={{ bottom: 4, left: -18, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,32,28,0.1)" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrency(Number(value))} width={52} />
                      <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} />
                      <Bar dataKey="expenses" fill="#f05a3f" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
              <div className="min-w-0 rounded-lg border border-ink/10 bg-white p-3">
                <h3 className="mb-3 text-sm font-semibold uppercase text-ink/55">Top categories</h3>
                <div className="space-y-3">
                  {monthlyReportCategoryRows.slice(0, 6).map((row) => {
                    const share = monthlyReportTotal > 0 ? (row.spent / monthlyReportTotal) * 100 : 0;

                    return (
                      <div key={row.id}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                            <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                            <span className="truncate font-medium">{categoryLabel(row.name)}</span>
                          </span>
                          <span className="shrink-0 text-right font-semibold">{currency.format(row.spent)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                          <div className="h-full rounded-full bg-coral" style={{ width: `${Math.min(share, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {monthlyReportCategoryRows.length === 0 ? <p className="text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-ink/10 bg-white p-3">
                <h3 className="mb-3 text-sm font-semibold uppercase text-ink/55">Top subcategories</h3>
                <div className="space-y-3">
                  {monthlyReportSubcategoryRows.slice(0, 6).map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                        <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{row.name}</span>
                          <span className="block truncate text-xs text-ink/45">{categoryLabel(row.categoryName)} - {row.count} entries</span>
                        </span>
                      </span>
                      <strong className="shrink-0 text-right">{currency.format(row.spent)}</strong>
                    </div>
                  ))}
                  {monthlyReportSubcategoryRows.length === 0 ? <p className="text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-ink/10 bg-white p-3">
                <h3 className="mb-3 text-sm font-semibold uppercase text-ink/55">Accounts used</h3>
                <div className="space-y-3">
                  {monthlyReportAccountRows.slice(0, 6).map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                        <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{row.name}</span>
                          <span className="block text-xs text-ink/45">{row.count} entries</span>
                        </span>
                      </span>
                      <strong className="shrink-0 text-right">{currency.format(row.spent)}</strong>
                    </div>
                  ))}
                  {monthlyReportAccountRows.length === 0 ? <p className="text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
                </div>
              </div>
            </div>

            <div className="mt-4 min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-3 py-3">
                <h3 className="text-sm font-semibold uppercase text-ink/55">Monthly transactions</h3>
                <span className="text-xs font-semibold text-ink/45">{monthlyReportFilteredTx.length} entries</span>
              </div>
              <div className="divide-y divide-ink/10 md:hidden">
                {monthlyReportFilteredTx.slice(0, 50).map((tx) => {
                  const category = displayCategories.find((item) => item.id === tx.categoryId);
                  const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
                  const account = accounts.find((item) => item.id === tx.accountId);

                  return (
                    <article key={tx.id} className="grid gap-2 px-3 py-3 text-sm">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{categoryLabel(category?.name)}{subcategory ? ` / ${subcategory.name}` : ""}</p>
                          <p className="text-xs text-ink/45">{format(parseISO(tx.occurredOn), "MMM d")} - {account?.name ?? "-"}</p>
                        </div>
                        <strong className="shrink-0 text-right text-coral">-{preciseCurrency.format(tx.amount)}</strong>
                      </div>
                      <p className="truncate text-xs text-ink/55">{tx.notes || tx.merchant || "-"}</p>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-ink/[0.03] text-xs uppercase text-ink/45">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Account</th>
                      <th className="px-3 py-2 font-semibold">Note</th>
                      <th className="px-3 py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReportFilteredTx.slice(0, 50).map((tx) => {
                      const category = displayCategories.find((item) => item.id === tx.categoryId);
                      const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
                      const account = accounts.find((item) => item.id === tx.accountId);

                      return (
                        <tr key={tx.id} className="border-t border-ink/10">
                          <td className="px-3 py-2 text-ink/65">{format(parseISO(tx.occurredOn), "MMM d")}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <span className="size-2.5 shrink-0 rounded-full" style={{ background: category?.color ?? "#64748b" }} />
                              <span className="truncate">{categoryLabel(category?.name)}{subcategory ? ` / ${subcategory.name}` : ""}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-ink/65">{account?.name ?? "-"}</td>
                          <td className="max-w-[260px] truncate px-3 py-2 text-ink/55">{tx.notes || tx.merchant || "-"}</td>
                          <td className="px-3 py-2 text-right font-semibold text-coral">-{preciseCurrency.format(tx.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {monthlyReportFilteredTx.length === 0 ? <p className="px-3 py-4 text-sm text-ink/45">{ui.noExpenseTransactions}</p> : null}
            </div>
              </Fragment>
            ) : (
              <Fragment>
                <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <ActivityStat label={format(monthlyReportMonth, "MMM yyyy")} value={currency.format(monthlyComparisonCurrentTotal)} sub="Current month" tone="coral" />
                  <ActivityStat label={format(monthlyCompareMonth, "MMM yyyy")} value={currency.format(monthlyComparisonCompareTotal)} sub="Comparison month" tone="ink" />
                  <ActivityStat
                    label="Difference"
                    value={`${monthlyComparisonDelta >= 0 ? "+" : ""}${currency.format(monthlyComparisonDelta)}`}
                    sub={`${monthlyComparisonDeltaPercent >= 0 ? "+" : ""}${monthlyComparisonDeltaPercent.toFixed(0)}%`}
                    tone={monthlyComparisonDelta > 0 ? "coral" : monthlyComparisonDelta < 0 ? "moss" : "ink"}
                  />
                  <ActivityStat
                    label={monthlyReportCategoryId === "all" ? "Compared categories" : "Compared subcategories"}
                    value={`${monthlyReportComparisonRows.length}`}
                    sub={monthlyReportCategoryId === "all" ? "category rows" : "subcategory rows"}
                    tone="ink"
                  />
                </div>

                <div className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-3 py-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold uppercase text-ink/55">
                        {monthlyReportCategoryId === "all" ? "Category comparison" : "Subcategory comparison"}
                      </h3>
                      <p className="mt-1 text-xs text-ink/45">
                        {format(monthlyReportMonth, "MMM yyyy")} vs {format(monthlyCompareMonth, "MMM yyyy")}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-ink/45">{monthlyReportComparisonRows.length} rows</span>
                  </div>

                  <div className="divide-y divide-ink/10 md:hidden">
                    {monthlyReportComparisonRows.map((row) => {
                      const currentWidth = (row.currentSpent / monthlyComparisonMaxSpend) * 100;
                      const compareWidth = (row.compareSpent / monthlyComparisonMaxSpend) * 100;
                      const deltaTone = row.deltaAmount > 0 ? "text-coral" : row.deltaAmount < 0 ? "text-moss" : "text-ink/55";
                      const deltaLabel = row.compareSpent === 0 && row.currentSpent > 0 ? "New" : `${row.deltaPercent >= 0 ? "+" : ""}${row.deltaPercent.toFixed(0)}%`;

                      return (
                        <article key={row.id} className="grid gap-3 px-3 py-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                              <span className="truncate font-semibold">{categoryLabel(row.name)}</span>
                            </span>
                            <span className={`shrink-0 text-right font-semibold ${deltaTone}`}>
                              {row.deltaAmount >= 0 ? "+" : ""}{currency.format(row.deltaAmount)}
                            </span>
                          </div>
                          <div className="grid gap-2">
                            <div>
                              <div className="mb-1 flex justify-between gap-2 text-xs text-ink/45">
                                <span>{format(monthlyReportMonth, "MMM")}</span>
                                <span>{currency.format(row.currentSpent)}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                                <div className="h-full rounded-full bg-coral" style={{ width: `${currentWidth}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 flex justify-between gap-2 text-xs text-ink/45">
                                <span>{format(monthlyCompareMonth, "MMM")}</span>
                                <span>{currency.format(row.compareSpent)}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                                <div className="h-full rounded-full bg-river" style={{ width: `${compareWidth}%` }} />
                              </div>
                            </div>
                          </div>
                          <p className={`text-xs font-semibold ${deltaTone}`}>{deltaLabel}</p>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[820px] w-full text-left text-sm">
                      <thead className="bg-ink/[0.03] text-xs uppercase text-ink/45">
                        <tr>
                          <th className="px-3 py-2 font-semibold">{monthlyReportCategoryId === "all" ? "Category" : "Subcategory"}</th>
                          <th className="px-3 py-2 text-right font-semibold">{format(monthlyReportMonth, "MMM yyyy")}</th>
                          <th className="px-3 py-2 text-right font-semibold">{format(monthlyCompareMonth, "MMM yyyy")}</th>
                          <th className="px-3 py-2 text-right font-semibold">Difference</th>
                          <th className="px-3 py-2 text-right font-semibold">Change</th>
                          <th className="px-3 py-2 font-semibold">Spend shape</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyReportComparisonRows.map((row) => {
                          const currentWidth = (row.currentSpent / monthlyComparisonMaxSpend) * 100;
                          const compareWidth = (row.compareSpent / monthlyComparisonMaxSpend) * 100;
                          const deltaTone = row.deltaAmount > 0 ? "text-coral" : row.deltaAmount < 0 ? "text-moss" : "text-ink/55";
                          const deltaLabel = row.compareSpent === 0 && row.currentSpent > 0 ? "New" : `${row.deltaPercent >= 0 ? "+" : ""}${row.deltaPercent.toFixed(0)}%`;

                          return (
                            <tr key={row.id} className="border-t border-ink/10">
                              <td className="px-3 py-2">
                                <span className="inline-flex min-w-0 items-center gap-2">
                                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                                  <span className="truncate font-medium">{categoryLabel(row.name)}</span>
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-coral">{currency.format(row.currentSpent)}</td>
                              <td className="px-3 py-2 text-right text-ink/65">{currency.format(row.compareSpent)}</td>
                              <td className={`px-3 py-2 text-right font-semibold ${deltaTone}`}>
                                {row.deltaAmount >= 0 ? "+" : ""}{currency.format(row.deltaAmount)}
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold ${deltaTone}`}>{deltaLabel}</td>
                              <td className="px-3 py-2">
                                <div className="grid gap-1">
                                  <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                                    <div className="h-full rounded-full bg-coral" style={{ width: `${currentWidth}%` }} />
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                                    <div className="h-full rounded-full bg-river" style={{ width: `${compareWidth}%` }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {monthlyReportComparisonRows.length === 0 ? <p className="px-3 py-4 text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
                </div>
              </Fragment>
            )}
          </Panel>
        </section>

        <section className={activeTab === "transactions" || activeTab === "budgets" || activeTab === "recurring" ? "mt-4 grid gap-4" : "hidden"}>
          {activeTab === "transactions" && (
          <Panel id="transactions" title={t.transactions} action={`${filteredTransactions.length} ${t.entries}`}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
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
              <form onSubmit={handleSubmit} className="rounded-lg border border-river/15 bg-river/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase text-river">Record new transaction</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${type === "income" ? "bg-moss/12 text-moss" : "bg-coral/12 text-coral"}`}>
                    {type === "income" ? t.income : t.expense}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[110px_110px_140px_140px_minmax(170px,1fr)_145px_auto]">
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
                  <select value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                    <option value="">Subcategory</option>
                    {subcategories.filter((subcategory) => subcategory.categoryId === categoryId).map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                  </select>
                  <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  <input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
                  <button disabled={!canAddTransaction} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-white transition hover:bg-river/85 disabled:cursor-not-allowed disabled:opacity-45">
                    <Plus size={17} />
                    {isSaving ? "Saving" : t.add}
                  </button>
                  <input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2 lg:col-span-full" placeholder={t.optionalNote} />
                </div>
              </form>
            </div>

            <div className="grid gap-3 lg:hidden">
              {filteredTransactions.slice(0, 14).map((tx) => {
                const category = displayCategories.find((item) => item.id === tx.categoryId);
                const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
                const account = accounts.find((item) => item.id === tx.accountId);
                const isEditing = editingTransactionId === tx.id;
                return (
                  <article key={tx.id} className={`rounded-lg border p-3 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{categoryLabel(category?.name)}{subcategory ? ` / ${subcategory.name}` : ""}</p>
                        <p className="mt-1 text-sm text-ink/55">{format(parseISO(tx.occurredOn), "MMM d")} - {account?.name}{tx.notes ? ` - ${tx.notes}` : ""}</p>
                      </div>
                      <strong className={`shrink-0 text-right ${tx.type === "income" ? "text-moss" : "text-coral"}`}>
                        {tx.type === "income" ? "+" : "-"}{preciseCurrency.format(tx.amount)}
                      </strong>
                    </div>
                    {isEditing ? (
                      <div className="mt-3">
                        {renderTransactionEditor(tx)}
                      </div>
                    ) : (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: category?.color }} />
                        <span className="truncate">{subcategory?.name ?? categoryLabel(category?.name)}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1">
                        <button aria-label="Edit transaction" onClick={() => startEditingTransaction(tx)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                          <Pencil size={16} />
                        </button>
                        <button aria-label="Delete transaction" onClick={() => deleteTransaction(tx.id)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-ink/50">
                    <th className="border-b border-ink/10 py-3 font-semibold">{t.date}</th>
                    <th className="border-b border-ink/10 py-3 font-semibold">{t.category}</th>
                    <th className="border-b border-ink/10 py-3 font-semibold">Subcategory</th>
                    <th className="border-b border-ink/10 py-3 font-semibold">{t.account}</th>
                    <th className="border-b border-ink/10 py-3 text-right font-semibold">{t.amount}</th>
                    <th className="border-b border-ink/10 py-3 text-right font-semibold">{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, 14).map((tx) => {
                    const category = displayCategories.find((item) => item.id === tx.categoryId);
                    const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
                    const account = accounts.find((item) => item.id === tx.accountId);
                    const isEditing = editingTransactionId === tx.id;
                    return (
                      <Fragment key={tx.id}>
                        <tr className={`group ${isEditing ? "bg-river/5" : ""}`}>
                          <td className="border-b border-ink/5 py-3 text-ink/65">{format(parseISO(tx.occurredOn), "MMM d")}</td>
                          <td className="border-b border-ink/5 py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="size-2.5 rounded-full" style={{ background: category?.color }} />
                              {categoryLabel(category?.name)}
                            </span>
                            {tx.notes ? <p className="mt-1 max-w-[240px] truncate text-xs text-ink/45">{tx.notes}</p> : null}
                          </td>
                          <td className="border-b border-ink/5 py-3 font-medium">{subcategory?.name ?? "-"}</td>
                          <td className="border-b border-ink/5 py-3 text-ink/65">{account?.name}</td>
                          <td className={`border-b border-ink/5 py-3 text-right font-semibold ${tx.type === "income" ? "text-moss" : "text-coral"}`}>
                            {tx.type === "income" ? "+" : "-"}{preciseCurrency.format(tx.amount)}
                          </td>
                          <td className="border-b border-ink/5 py-3 text-right">
                            <span className="inline-flex items-center justify-end gap-1">
                              <button aria-label="Edit transaction" onClick={() => startEditingTransaction(tx)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                                <Pencil size={16} />
                              </button>
                              <button aria-label="Delete transaction" onClick={() => deleteTransaction(tx.id)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                                <Trash2 size={16} />
                              </button>
                            </span>
                          </td>
                        </tr>
                        {isEditing ? (
                          <tr>
                            <td colSpan={6} className="border-b border-river/15 py-3">
                              {renderTransactionEditor(tx)}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
              </div>
              <aside className="xl:sticky xl:top-4 xl:self-start">
                <MonthCalendar
                  month={visibleMonth}
                  selectedDate={selectedTransactionDate}
                  summaries={transactionCalendarDays}
                  variant="transactions"
                  labels={ui}
                  onMonthChange={(month) => {
                    setVisibleMonth(month);
                    setSelectedTransactionDate("");
                  }}
                  onDateSelect={setSelectedTransactionDate}
                  onClearDate={() => setSelectedTransactionDate("")}
                />
              </aside>
            </div>
          </Panel>
          )}

          {(activeTab === "budgets" || activeTab === "recurring") && <div className="grid gap-4">
            {activeTab === "budgets" && (
            <Panel id="budgets" title={t.budgetHealth} action={t.monthlyLimits}>
              <form onSubmit={handleSetBudget} className="mb-4 max-w-3xl rounded-lg border border-river/15 bg-river/5 p-3">
                <h3 className="mb-3 text-sm font-semibold uppercase text-river">Set new monthly budget</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[150px_minmax(0,1fr)_150px_auto]">
                  <input
                    type="month"
                    value={budgetMonth}
                    onChange={(event) => {
                      setBudgetMonth(event.target.value);
                      setVisibleMonth(parseISO(`${event.target.value}-01`));
                    }}
                    className="h-11 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                  />
                  <select
                    value={budgetCategoryId}
                    onChange={(event) => setBudgetCategoryId(event.target.value)}
                    className="h-11 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                  >
                    {categories.filter((category) => category.kind === "expense").map((category) => (
                      <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
                    ))}
                  </select>
                  <input
                    value={budgetAmount}
                    onChange={(event) => setBudgetAmount(event.target.value)}
                    className="h-11 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                    inputMode="decimal"
                    placeholder="Amount"
                  />
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 lg:col-span-1" disabled={savingBudgetId === budgetCategoryId}>
                    <Plus size={17} />
                    {savingBudgetId === budgetCategoryId ? "Saving budget" : "Save monthly budget"}
                  </button>
                </div>
              </form>
              <div className="grid gap-3 xl:grid-cols-2">
                {budgetTabRows.map((row) => {
                  const isEditing = editingBudgetId === row.id;

                  return (
                  <article key={row.id} className={`rounded-lg border p-4 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
                    <div className="mb-4 grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-start">
                      <div className="min-w-0">
                        <p className="font-medium">{categoryLabel(row.name)}</p>
                        <p className={row.spent > (row.monthlyBudget ?? 0) ? "font-semibold text-coral" : "text-ink/60"}>
                          {currency.format(row.spent)} spent / {currency.format(row.monthlyBudget ?? 0)} budget for {budgetMonth}
                        </p>
                      </div>
                      {isEditing ? (
                        <form onSubmit={(event) => handleSaveBudget(event, row.id)} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 md:w-80">
                          <input
                            value={budgetDrafts[row.id] ?? ""}
                            onChange={(event) => setBudgetDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                            className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                            inputMode="decimal"
                            placeholder="Budget"
                          />
                          <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={savingBudgetId === row.id}>
                            {savingBudgetId === row.id ? "Saving" : "Update"}
                          </button>
                          <button type="button" aria-label="Cancel budget edit" onClick={() => {
                            setEditingBudgetId("");
                            setBudgetDrafts((current) => ({ ...current, [row.id]: String(row.monthlyBudget ?? "") }));
                          }} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                            <X size={16} />
                          </button>
                        </form>
                      ) : (
                        <div className="inline-flex justify-end gap-1">
                          <button type="button" aria-label="Edit budget" onClick={() => {
                            setEditingBudgetId(row.id);
                            setBudgetDrafts((current) => ({ ...current, [row.id]: String(row.monthlyBudget ?? "") }));
                          }} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                            <Pencil size={16} />
                          </button>
                          <button type="button" aria-label="Delete budget category" onClick={() => handleDeleteBudget(row.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral" disabled={savingBudgetId === row.id}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="max-w-md">
                      <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink/50">
                        <span>{Math.min(row.progress, 100).toFixed(0)}% used</span>
                        <span>{currency.format(row.remaining)} left</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(row.progress, 100)}%`, background: row.spent > (row.monthlyBudget ?? Infinity) ? "#f05a3f" : "#f97316" }} />
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            </Panel>
            )}

            {activeTab === "recurring" && (
            <Panel id="recurring" title={t.recurring} action={`${displayedRecurringRules.length} ${t.rules}`}>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0">
              <form onSubmit={handleCreateRecurring} className="mb-4 max-w-3xl rounded-lg border border-river/15 bg-river/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase text-river">Add new recurring item</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${recurringType === "income" ? "bg-moss/12 text-moss" : "bg-coral/12 text-coral"}`}>
                    {recurringType === "income" ? t.income : t.expense}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <select value={recurringType} onChange={(event) => setRecurringType(event.target.value as TransactionType)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                    <option value="expense">{t.expense}</option>
                    <option value="income">{t.income}</option>
                  </select>
                  <input value={recurringAmount} onChange={(event) => setRecurringAmount(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder={t.amount} />
                  <input value={recurringName} onChange={(event) => setRecurringName(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2 lg:col-span-1" placeholder="Name, e.g. Electricity bill" />
                  <select value={recurringCategoryId} onChange={(event) => setRecurringCategoryId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                    {categories.filter((category) => category.kind === recurringType).map((category) => (
                      <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
                    ))}
                  </select>
                  <select value={recurringSubcategoryId} onChange={(event) => setRecurringSubcategoryId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                    <option value="">No subcategory</option>
                    {subcategories.filter((subcategory) => subcategory.categoryId === recurringCategoryId).map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                  </select>
                  <select value={recurringAccountId} onChange={(event) => setRecurringAccountId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  <select value={recurringFrequency} onChange={(event) => setRecurringFrequency(event.target.value as RecurringRule["frequency"])} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <input type="date" value={recurringNextDueOn} onChange={(event) => setRecurringNextDueOn(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
                  <label className="flex h-11 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                    <input type="checkbox" checked={recurringAutoCreate} onChange={(event) => setRecurringAutoCreate(event.target.checked)} />
                    Auto-create
                  </label>
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-white sm:col-span-2 lg:col-span-1">
                    <Plus size={17} />
                    Add
                  </button>
                </div>
              </form>
              <div className="space-y-3">
                {displayedRecurringRules.map((rule) => {
                  const isEditing = editingRecurringId === rule.id;
                  const ruleCategory = displayCategories.find((category) => category.id === rule.categoryId);
                  const ruleSubcategory = subcategories.find((subcategory) => subcategory.id === rule.subcategoryId);
                  const ruleAccount = accounts.find((account) => account.id === rule.accountId);
                  const matchedTransaction = recurringPayments[rule.id];
                  const isPaid = Boolean(matchedTransaction);
                  const paymentStatusLabel = isPaid ? (rule.type === "income" ? "Received" : "Paid") : rule.type === "income" ? "Not received" : "Unpaid";
                  const paymentStatusTone = isPaid ? "bg-moss/12 text-moss" : "bg-coral/12 text-coral";
                  const dueStatusTone = isPaid ? "bg-ink/5 text-ink/55" : rule.daysUntilDue < 0 ? "bg-coral/12 text-coral" : rule.daysUntilDue === 0 ? "bg-amber/15 text-amber" : "bg-ink/5 text-ink/55";
                  const recurringActionClass = isPaid
                    ? "h-10 rounded-lg border border-moss/20 bg-moss/10 px-3 text-sm font-semibold text-moss transition disabled:cursor-not-allowed"
                    : "h-10 rounded-lg border border-ink/10 px-3 text-sm font-semibold text-ink/60 transition hover:bg-moss/10 hover:text-moss disabled:cursor-not-allowed disabled:opacity-45";
                  return (
                    <article key={rule.id} className={`rounded-lg border p-3 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{rule.merchant}{ruleSubcategory ? ` / ${ruleSubcategory.name}` : ""}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusTone}`}>
                              {isPaid ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                              {paymentStatusLabel}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dueStatusTone}`}>
                              {matchedTransaction ? `Recorded ${format(parseISO(matchedTransaction.occurredOn), "MMM d")}` : recurringDueLabel(rule.daysUntilDue)}
                            </span>
                          </div>
                          <p className={`mt-1 text-sm ${!matchedTransaction && rule.daysUntilDue < 0 ? "font-semibold text-coral" : "text-ink/55"}`}>
                            Due {format(parseISO(rule.nextDueOn), "MMM d, yyyy")} - {categoryLabel(ruleCategory?.name)} - {ruleAccount?.name} - {frequencyLabel(rule.frequency)}
                            {rule.autoCreate ? " - Auto-create" : ""}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <strong className={`shrink-0 px-2 ${rule.type === "income" ? "text-moss" : "text-coral"}`}>{rule.type === "income" ? "+" : "-"}{currency.format(rule.amount)}</strong>
                          {!isEditing ? (
                            <>
                              <button type="button" onClick={() => handleMarkRecurringPaid(rule)} disabled={isPaid || savingRecurringId === rule.id} className={recurringActionClass}>
                                {savingRecurringId === rule.id ? "Recording" : isPaid ? paymentStatusLabel : rule.type === "income" ? "Record received" : "Mark paid"}
                              </button>
                              <button type="button" aria-label="Edit recurring item" onClick={() => startEditingRecurring(rule)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                                <Pencil size={16} />
                              </button>
                              <button type="button" aria-label="Delete recurring item" onClick={() => handleDeleteRecurring(rule.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {isEditing ? renderRecurringEditor(rule) : null}
                    </article>
                  );
                })}
              </div>
                </div>
                <aside className="xl:sticky xl:top-4 xl:self-start">
                  <MonthCalendar
                    month={visibleMonth}
                    selectedDate={selectedRecurringDate}
                    summaries={recurringCalendarDays}
                    variant="recurring"
                    labels={ui}
                    onMonthChange={(month) => {
                      setVisibleMonth(month);
                      setSelectedRecurringDate("");
                    }}
                    onDateSelect={setSelectedRecurringDate}
                    onClearDate={() => setSelectedRecurringDate("")}
                  />
                </aside>
              </div>
            </Panel>
            )}
          </div>}
        </section>

        <section className={activeTab === "goals" || activeTab === "settings" ? "mt-4 grid gap-4" : "hidden"}>
          {activeTab === "goals" && (
          <Panel id="goals" title={t.goals} action={t.savingsProgress}>
            <form onSubmit={handleCreateGoal} className="mb-4 max-w-3xl rounded-lg border border-river/15 bg-river/5 p-3">
              <h3 className="mb-3 text-sm font-semibold uppercase text-river">Add savings goal</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_130px_130px_145px]">
                <input value={goalName} onChange={(event) => setGoalName(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" placeholder="Goal name" />
                <input value={goalTargetAmount} onChange={(event) => setGoalTargetAmount(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Target" />
                <input value={goalCurrentAmount} onChange={(event) => setGoalCurrentAmount(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Saved now" />
                <input type="date" value={goalTargetDate} onChange={(event) => setGoalTargetDate(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-white sm:col-span-2 lg:col-span-full">
                  <Plus size={17} />
                  Add goal
                </button>
              </div>
            </form>
            <div className="space-y-4">
              {goals.map((goal) => {
                const draft = goalDrafts[goal.id] ?? goalToDraft(goal);
                const isEditing = editingGoalId === goal.id;
                const goalProgress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

                return (
                <article key={goal.id} className={`rounded-lg border p-3 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
                  <div className="mb-2 grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="font-medium">{goal.name}</p>
                      <p className="text-ink/60">{currency.format(goal.currentAmount)} saved / {currency.format(goal.targetAmount)} target</p>
                    </div>
                    {isEditing ? (
                      <form onSubmit={(event) => handleUpdateGoal(event, goal.id)} className="grid gap-2 sm:grid-cols-2 md:w-[560px] md:grid-cols-[minmax(0,1fr)_110px_110px_132px_auto_auto]">
                        <input value={draft.name} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, name: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm" placeholder="Name" />
                        <input value={draft.targetAmount} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, targetAmount: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Target" />
                        <input value={draft.currentAmount} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, currentAmount: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Saved" />
                        <input type="date" value={draft.targetDate} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, targetDate: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
                        <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={savingGoalId === goal.id}>
                          {savingGoalId === goal.id ? "Saving" : "Update"}
                        </button>
                        <button type="button" aria-label="Cancel goal edit" onClick={() => cancelEditingGoal(goal)} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                          <X size={16} />
                        </button>
                      </form>
                    ) : (
                      <div className="inline-flex justify-end gap-1">
                        <button type="button" aria-label="Edit goal" onClick={() => startEditingGoal(goal)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                          <Pencil size={16} />
                        </button>
                        <button type="button" aria-label="Delete goal" onClick={() => handleDeleteGoal(goal.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full" style={{ width: `${goalProgress}%`, background: goal.color }} />
                  </div>
                </article>
                );
              })}
            </div>
          </Panel>
          )}

          {activeTab === "settings" && (
          <Panel id="settings" title="Settings" action="Manage accounts, categories and subcategories">
            <div className="grid gap-4">
              <div className="rounded-lg border border-ink/10 bg-white p-3">
                <h3 className="mb-3 font-semibold">Banking accounts</h3>
                <div className="grid gap-2">
                  {balances.map((account) => {
                    const draft = accountDrafts[account.id] ?? accountToDraft(account);
                    const isEditing = editingAccountId === account.id;

                    return (
                      <article key={account.id} className={`rounded-lg border p-2 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10"}`}>
                        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="size-3 rounded-full" style={{ background: account.color }} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{account.name}</p>
                              <p className="mt-1 text-xs text-ink/55">{account.type.replace("_", " ")} - Current balance: {currency.format(account.balance)}</p>
                            </div>
                          </div>
                          {isEditing ? (
                            <form onSubmit={(event) => handleUpdateAccount(event, account.id)} className="grid gap-2 md:w-[560px] md:grid-cols-[minmax(0,1fr)_140px_130px_92px_auto_auto] md:items-center">
                              <input value={draft.name} onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, name: event.target.value } }))} className="h-10 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm font-semibold" placeholder="Account name" />
                              <select value={draft.type} onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, type: event.target.value as AccountType } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                                <option value="cash">Cash</option>
                                <option value="checking">Checking</option>
                                <option value="savings">Savings</option>
                                <option value="credit_card">Credit card</option>
                                <option value="wallet">Wallet</option>
                                <option value="investment">Investment</option>
                              </select>
                              <input value={draft.openingBalance} onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, openingBalance: event.target.value } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Opening" />
                              <input type="color" value={draft.color} onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, color: event.target.value } }))} className="h-10 w-full rounded-lg border border-ink/10 bg-white px-2" aria-label="Account color" />
                              <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={savingAccountId === account.id}>
                                {savingAccountId === account.id ? "Saving" : "Update"}
                              </button>
                              <button type="button" aria-label="Cancel account edit" onClick={() => cancelEditingAccount(account)} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                                <X size={16} />
                              </button>
                            </form>
                          ) : (
                            <div className="inline-flex justify-end gap-1">
                              <button type="button" aria-label="Edit account" onClick={() => startEditingAccount(account)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                                <Pencil size={16} />
                              </button>
                              <button type="button" aria-label="Delete account" onClick={() => handleDeleteAccount(account.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <CategoryManager
                categories={displayCategories}
                subcategories={subcategories}
                newCategoryName={newCategoryName}
                newCategoryKind={newCategoryKind}
                newCategoryBudget={newCategoryBudget}
                newSubcategoryName={newSubcategoryName}
                newSubcategoryCategoryId={newSubcategoryCategoryId}
                onCategoryNameChange={setNewCategoryName}
                onCategoryKindChange={setNewCategoryKind}
                onCategoryBudgetChange={setNewCategoryBudget}
                onSubcategoryNameChange={setNewSubcategoryName}
                onSubcategoryCategoryChange={setNewSubcategoryCategoryId}
                onCreateCategory={handleCreateCategory}
                onCreateSubcategory={handleCreateSubcategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateSubcategory={handleUpdateSubcategory}
                onDeleteSubcategory={handleDeleteSubcategory}
              />
            </div>
          </Panel>
          )}

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
    <section id={id} className="min-w-0 rounded-lg border border-ink/10 bg-white p-3 shadow-soft sm:p-4">
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="min-w-0 text-base font-semibold sm:text-lg">{title}</h2>
        <span className="shrink-0 text-sm text-ink/55">{action}</span>
      </div>
      {children}
    </section>
  );
}

function ActivityStat({
  label,
  value,
  sub,
  tone,
  compact = false
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "coral" | "moss" | "amber" | "ink";
  compact?: boolean;
}) {
  const toneClass = {
    amber: "text-amber",
    coral: "text-coral",
    ink: "text-ink",
    moss: "text-moss"
  }[tone];

  return (
    <div className={compact ? "min-w-0" : "min-w-0 rounded-lg border border-ink/10 bg-white p-3"}>
      <p className="truncate text-xs uppercase text-ink/45">{label}</p>
      <p className={`break-words font-semibold leading-tight ${compact ? "text-sm" : "text-base"} ${toneClass}`}>{value}</p>
      {sub ? <p className="text-xs text-ink/45">{sub}</p> : null}
    </div>
  );
}

function MonthField({
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
        onChange={(event) => onChange(parseISO(`${event.target.value}-01`))}
        className="h-9 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink sm:w-auto"
      />
    </label>
  );
}

function MonthCalendar({
  month,
  selectedDate,
  summaries,
  variant,
  labels,
  onMonthChange,
  onDateSelect,
  onClearDate
}: {
  month: Date;
  selectedDate: string;
  summaries: Record<string, CalendarDaySummary>;
  variant: "transactions" | "recurring" | "activity";
  labels: Record<keyof typeof uiTranslations.en, string>;
  onMonthChange: (month: Date) => void;
  onDateSelect: (date: string) => void;
  onClearDate: () => void;
}) {
  const days = buildCalendarGrid(month);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedSummary = selectedDate ? summaries[selectedDate] : undefined;
  const selectedWeekStart = selectedDate ? startOfWeek(parseISO(selectedDate)) : undefined;
  const selectedWeekEnd = selectedDate ? endOfWeek(parseISO(selectedDate)) : undefined;

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase text-ink/65">{variant === "recurring" ? labels.recurringDue : labels.monthlyActivity}</h3>
          <p className="mt-1 text-xs text-ink/45">
            {selectedDate
              ? `${format(parseISO(selectedDate), "MMM d, yyyy")} selected${selectedSummary?.count || selectedSummary?.recurringCount || selectedSummary?.paidRecurringCount ? "" : " - no items"}`
              : variant === "activity" ? labels.scanActivityMonth : labels.pickDayToFilter}
          </p>
        </div>
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => onMonthChange(startOfMonth(subMonths(month, 1)))} className="grid size-9 place-items-center rounded-lg border border-ink/10 text-ink/55 transition hover:bg-river/10 hover:text-river" aria-label="Previous month">
            ‹
          </button>
          <span className="min-w-28 text-center text-sm font-semibold">{format(month, "MMM yyyy")}</span>
          <button type="button" onClick={() => onMonthChange(startOfMonth(addMonths(month, 1)))} className="grid size-9 place-items-center rounded-lg border border-ink/10 text-ink/55 transition hover:bg-river/10 hover:text-river" aria-label="Next month">
            ›
          </button>
          {selectedDate ? (
            <button type="button" onClick={onClearDate} className="ml-1 h-9 rounded-lg border border-ink/10 px-3 text-xs font-semibold text-ink/55 transition hover:bg-ink/5 hover:text-ink">
              {labels.clear}
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-ink/40">
        {weekdays.map((weekday) => (
          <span key={weekday} className="py-1">{weekday}</span>
        ))}
      </div>
      {variant === "activity" ? (
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-ink/55">
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-coral" /> {labels.spending}</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-moss" /> {labels.incomeLegend}</span>
          <span className="inline-flex items-center gap-1"><span className="rounded bg-amber/15 px-1.5 py-0.5 font-semibold text-amber">{labels.due}</span> {labels.recurringDue}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const summary = summaries[key];
          const selected = selectedDate === key;
          const inMonth = isSameMonth(day, month);
          const hasData = Boolean(summary?.count || summary?.recurringCount || summary?.paidRecurringCount);
          const intensity = summary?.expense ? Math.min(summary.expense / 50000, 1) : 0;
          const inSelectedWeek = Boolean(selectedWeekStart && selectedWeekEnd && day >= selectedWeekStart && day <= selectedWeekEnd);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDateSelect(key)}
              className={`min-h-20 rounded-lg border p-1.5 text-left transition ${
                selected
                  ? "border-river bg-river/10 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.14)]"
                  : variant === "activity" && inSelectedWeek
                    ? "border-river/25 bg-river/5"
                  : hasData
                    ? "border-ink/10 bg-white hover:border-river/35 hover:bg-river/5"
                    : "border-transparent bg-ink/[0.025] hover:bg-ink/[0.04]"
              } ${inMonth ? "text-ink" : "text-ink/30"}`}
              style={variant === "activity" && intensity > 0 && !selected ? { background: `rgba(249, 115, 22, ${0.08 + intensity * 0.26})` } : undefined}
            >
              <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${isToday(day) ? "bg-ink text-white" : ""}`}>
                {format(day, "d")}
              </span>
              {variant === "activity" ? (
                <span className="mt-1 block space-y-0.5">
                  {summary?.expense ? <span className="block truncate text-[11px] font-semibold text-coral">{compactCurrency(summary.expense)}</span> : null}
                  <span className="flex min-h-4 items-center gap-1">
                    {summary?.income ? <span className="rounded bg-moss/10 px-1 text-[10px] font-semibold text-moss">+</span> : null}
                    {summary?.recurringCount ? <span className="rounded bg-amber/15 px-1 text-[10px] font-semibold text-amber">{labels.due}</span> : null}
                  </span>
                </span>
              ) : variant === "transactions" ? (
                <span className="mt-1 block space-y-0.5">
                  {summary?.expense ? <span className="block truncate text-[11px] font-semibold text-coral">-{currency.format(summary.expense)}</span> : null}
                  {summary?.income ? <span className="block truncate text-[11px] font-semibold text-moss">+{currency.format(summary.income)}</span> : null}
                  {summary?.count ? <span className="block text-[10px] text-ink/45">{summary.count} entries</span> : null}
                </span>
              ) : (
                <span className="mt-1 block space-y-0.5">
                  {summary?.recurringCount ? <span className="block text-[11px] font-semibold text-coral">{summary.recurringCount} due</span> : null}
                  {summary?.paidRecurringCount ? <span className="block text-[11px] font-semibold text-moss">{summary.paidRecurringCount} paid</span> : null}
                  {summary?.dueAmount ? <span className="block truncate text-[10px] text-ink/55">{currency.format(summary.dueAmount)}</span> : null}
                  {summary?.paidAmount ? <span className="block truncate text-[10px] text-moss/75">{currency.format(summary.paidAmount)}</span> : null}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function buildCalendarGrid(month: Date) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month))
  });
}

function summarizeTransactionsByDay(transactions: Transaction[]) {
  return transactions.reduce<Record<string, CalendarDaySummary>>((summary, transaction) => {
    const current = summary[transaction.occurredOn] ?? {};

    summary[transaction.occurredOn] = {
      ...current,
      count: (current.count ?? 0) + 1,
      income: (current.income ?? 0) + (transaction.type === "income" ? transaction.amount : 0),
      expense: (current.expense ?? 0) + (transaction.type === "expense" ? transaction.amount : 0)
    };

    return summary;
  }, {});
}

function summarizeRecurringByDay(rules: RecurringRule[]) {
  return rules.reduce<Record<string, CalendarDaySummary>>((summary, rule) => {
    const current = summary[rule.nextDueOn] ?? {};

    summary[rule.nextDueOn] = {
      ...current,
      recurringCount: (current.recurringCount ?? 0) + 1,
      dueAmount: (current.dueAmount ?? 0) + (rule.type === "expense" ? rule.amount : 0)
    };

    return summary;
  }, {});
}

function summarizeRecurringCalendarByDay(rules: RecurringRule[], transactions: Transaction[], paymentsByRule: Record<string, Transaction | undefined>, monthKey: string) {
  const paidTransactions = new Map<string, Transaction>();
  const paidRuleIds = new Set<string>();

  Object.entries(paymentsByRule).forEach(([ruleId, transaction]) => {
    if (!transaction) {
      return;
    }

    paidRuleIds.add(ruleId);

    if (transaction.occurredOn.startsWith(monthKey)) {
      paidTransactions.set(transaction.id, transaction);
    }
  });

  transactions
    .filter((transaction) => transaction.isRecurring && transaction.occurredOn.startsWith(monthKey))
    .forEach((transaction) => paidTransactions.set(transaction.id, transaction));

  const dueSummary = summarizeRecurringByDay(rules.filter((rule) => rule.nextDueOn.startsWith(monthKey) && !paidRuleIds.has(rule.id)));
  const paidSummary = Array.from(paidTransactions.values()).reduce<Record<string, CalendarDaySummary>>((summary, transaction) => {
    const current = summary[transaction.occurredOn] ?? {};

    summary[transaction.occurredOn] = {
      ...current,
      paidAmount: (current.paidAmount ?? 0) + transaction.amount,
      paidRecurringCount: (current.paidRecurringCount ?? 0) + 1
    };

    return summary;
  }, {});

  return mergeCalendarSummaries(dueSummary, paidSummary);
}

function summarizeActivityRange(transactions: Transaction[], rules: RecurringRule[], start: Date, end: Date): Required<CalendarDaySummary> {
  const startKey = format(start, "yyyy-MM-dd");
  const endKey = format(end, "yyyy-MM-dd");

  const transactionSummary = transactions
    .filter((transaction) => transaction.occurredOn >= startKey && transaction.occurredOn <= endKey)
    .reduce<Required<CalendarDaySummary>>((summary, transaction) => ({
      ...summary,
      count: summary.count + 1,
      income: summary.income + (transaction.type === "income" ? transaction.amount : 0),
      expense: summary.expense + (transaction.type === "expense" ? transaction.amount : 0)
    }), emptyCalendarSummary());

  return rules
    .filter((rule) => rule.nextDueOn >= startKey && rule.nextDueOn <= endKey)
    .reduce<Required<CalendarDaySummary>>((summary, rule) => ({
      ...summary,
      dueAmount: summary.dueAmount + (rule.type === "expense" ? rule.amount : 0),
      recurringCount: summary.recurringCount + 1
    }), transactionSummary);
}

function mergeCalendarSummaries(...summaries: Record<string, CalendarDaySummary>[]) {
  return summaries.reduce<Record<string, CalendarDaySummary>>((merged, summary) => {
    Object.entries(summary).forEach(([date, value]) => {
      const current = merged[date] ?? {};
      merged[date] = {
        income: (current.income ?? 0) + (value.income ?? 0),
        expense: (current.expense ?? 0) + (value.expense ?? 0),
        count: (current.count ?? 0) + (value.count ?? 0),
        dueAmount: (current.dueAmount ?? 0) + (value.dueAmount ?? 0),
        recurringCount: (current.recurringCount ?? 0) + (value.recurringCount ?? 0),
        paidAmount: (current.paidAmount ?? 0) + (value.paidAmount ?? 0),
        paidRecurringCount: (current.paidRecurringCount ?? 0) + (value.paidRecurringCount ?? 0)
      };
    });

    return merged;
  }, {});
}

function monthlyComparisonForMonth(transactions: Transaction[], month: Date) {
  const current = totals(monthTransactions(transactions, month));
  const previous = totals(monthTransactions(transactions, subMonths(month, 1)));

  return {
    incomeDelta: percentDelta(current.income, previous.income),
    expenseDelta: percentDelta(current.expenses, previous.expenses)
  };
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function emptyCalendarSummary(): Required<CalendarDaySummary> {
  return {
    income: 0,
    expense: 0,
    count: 0,
    dueAmount: 0,
    recurringCount: 0,
    paidAmount: 0,
    paidRecurringCount: 0
  };
}

function compactCurrency(value: number) {
  if (value >= 1000000) {
    return `฿${(value / 1000000).toFixed(1)}m`;
  }

  if (value >= 1000) {
    return `฿${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return currency.format(value);
}

function applyCategoryDisplayColors(categories: Category[]) {
  return categories.map((category, index) => ({
    ...category,
    color: categoryDisplayColor(index)
  }));
}

function categoryDisplayColor(index: number) {
  if (index < categoryDisplayColors.length) {
    return categoryDisplayColors[index];
  }

  return `hsl(${Math.round((index * 137.508) % 360)} 88% 48%)`;
}

function applyMonthlyBudgets(categories: Category[], budgets: Budget[], month: string) {
  return categories.map((category) => {
    const budget = budgets.find((item) => item.categoryId === category.id && item.month.startsWith(month));
    return {
      ...category,
      monthlyBudget: budget?.amount ?? category.monthlyBudget
    };
  });
}

function upsertBudgetInState(budgets: Budget[], updated: Budget) {
  const exists = budgets.some((budget) => budget.id === updated.id);

  if (exists) {
    return budgets.map((budget) => (budget.id === updated.id ? updated : budget));
  }

  return [updated, ...budgets];
}

function findRecurringPayment(rule: RecurringRule, transactions: Transaction[], referenceDate = new Date()) {
  const dueOn = recurringPaymentDueOnForStatus(rule, referenceDate);
  const window = recurringPaymentWindow(rule, dueOn);
  const tolerance = Math.max(rule.amount * 0.1, 10);

  return transactions
    .filter((transaction) => {
      const sameType = transaction.type === rule.type;
      const sameCategory = rule.categoryId ? transaction.categoryId === rule.categoryId : true;
      const sameSubcategory = rule.subcategoryId ? transaction.subcategoryId === rule.subcategoryId : true;
      const amountMatches = Math.abs(transaction.amount - rule.amount) <= tolerance;
      const inWindow = transaction.occurredOn >= window.start && transaction.occurredOn <= window.end;

      return sameType && sameCategory && sameSubcategory && amountMatches && inWindow;
    })
    .sort((a, b) => Number(Boolean(b.isRecurring)) - Number(Boolean(a.isRecurring)) || Math.abs(parseISO(a.occurredOn).getTime() - parseISO(dueOn).getTime()) - Math.abs(parseISO(b.occurredOn).getTime() - parseISO(dueOn).getTime()))[0];
}

function recurringPaymentDueOnForStatus(rule: RecurringRule, referenceDate: Date) {
  const nextDueDate = parseISO(rule.nextDueOn);
  const previousDueDate = previousRecurringDueDate(rule);
  const isPaidCycleInView = nextDueDate > endOfMonth(referenceDate) && (isSameMonth(previousDueDate, referenceDate) || previousDueDate > referenceDate);

  return format(isPaidCycleInView ? previousDueDate : nextDueDate, "yyyy-MM-dd");
}

function recurringPaymentWindow(rule: RecurringRule, dueOn = rule.nextDueOn) {
  const dueDate = parseISO(dueOn);
  const days = {
    weekly: 3,
    biweekly: 5,
    monthly: 14,
    quarterly: 21,
    yearly: 30
  }[rule.frequency];

  return {
    start: format(addDays(dueDate, -days), "yyyy-MM-dd"),
    end: format(addDays(dueDate, days), "yyyy-MM-dd")
  };
}

function previousRecurringDueDate(rule: RecurringRule) {
  const dueDate = parseISO(rule.nextDueOn);

  return {
    weekly: addDays(dueDate, -7),
    biweekly: addDays(dueDate, -14),
    monthly: subMonths(dueDate, 1),
    quarterly: subMonths(dueDate, 3),
    yearly: subMonths(dueDate, 12)
  }[rule.frequency];
}

function nextRecurringDueOn(rule: RecurringRule) {
  const dueDate = parseISO(rule.nextDueOn);
  const nextDate = {
    weekly: addDays(dueDate, 7),
    biweekly: addDays(dueDate, 14),
    monthly: addMonths(dueDate, 1),
    quarterly: addMonths(dueDate, 3),
    yearly: addMonths(dueDate, 12)
  }[rule.frequency];

  return format(nextDate, "yyyy-MM-dd");
}

function recurringRuleToDraft(rule: RecurringRule): RecurringDraft {
  return {
    accountId: rule.accountId,
    categoryId: rule.categoryId ?? "",
    subcategoryId: rule.subcategoryId ?? "",
    type: rule.type,
    amount: String(rule.amount),
    merchant: rule.merchant,
    frequency: rule.frequency,
    nextDueOn: rule.nextDueOn,
    autoCreate: rule.autoCreate
  };
}

function transactionToDraft(transaction: Transaction): TransactionDraft {
  return {
    accountId: transaction.accountId,
    categoryId: transaction.categoryId ?? "",
    subcategoryId: transaction.subcategoryId ?? "",
    type: transaction.type,
    amount: String(transaction.amount),
    occurredOn: transaction.occurredOn,
    notes: transaction.notes ?? ""
  };
}

function goalToDraft(goal: Goal): GoalDraft {
  return {
    name: goal.name,
    targetAmount: String(goal.targetAmount),
    currentAmount: String(goal.currentAmount),
    targetDate: goal.targetDate ?? ""
  };
}

function accountToDraft(account: Account): AccountDraft {
  return {
    name: account.name,
    type: account.type,
    openingBalance: String(account.openingBalance),
    color: account.color
  };
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
  tone: "moss" | "river" | "coral";
}) {
  const tones = {
    moss: "bg-moss/12 text-moss",
    river: "bg-river/12 text-river",
    coral: "bg-coral/12 text-coral"
  };

  return (
    <article className="rounded-lg border border-ink/10 bg-white p-3 shadow-soft sm:p-4">
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

function CategoryManager({
  categories,
  subcategories,
  newCategoryName,
  newCategoryKind,
  newCategoryBudget,
  newSubcategoryName,
  newSubcategoryCategoryId,
  onCategoryNameChange,
  onCategoryKindChange,
  onCategoryBudgetChange,
  onSubcategoryNameChange,
  onSubcategoryCategoryChange,
  onCreateCategory,
  onCreateSubcategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateSubcategory,
  onDeleteSubcategory
}: {
  categories: Category[];
  subcategories: Subcategory[];
  newCategoryName: string;
  newCategoryKind: TransactionType;
  newCategoryBudget: string;
  newSubcategoryName: string;
  newSubcategoryCategoryId: string;
  onCategoryNameChange: (value: string) => void;
  onCategoryKindChange: (value: TransactionType) => void;
  onCategoryBudgetChange: (value: string) => void;
  onSubcategoryNameChange: (value: string) => void;
  onSubcategoryCategoryChange: (value: string) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onCreateSubcategory: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateCategory: (id: string, input: { name: string; kind: TransactionType; monthlyBudget: string }) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateSubcategory: (id: string, input: { categoryId: string; name: string }) => void;
  onDeleteSubcategory: (id: string) => void;
}) {
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, { name: string; kind: TransactionType; monthlyBudget: string }>>({});
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<string, { categoryId: string; name: string }>>({});
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingSubcategoryId, setEditingSubcategoryId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  useEffect(() => {
    setCategoryDrafts(Object.fromEntries(categories.map((category) => [category.id, {
      name: category.name,
      kind: category.kind,
      monthlyBudget: String(category.monthlyBudget ?? "")
    }])));
  }, [categories]);

  useEffect(() => {
    setSubcategoryDrafts(Object.fromEntries(subcategories.map((subcategory) => [subcategory.id, {
      categoryId: subcategory.categoryId,
      name: subcategory.name
    }])));
  }, [subcategories]);

  useEffect(() => {
    if (!categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]?.id ?? "");
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="grid gap-4">
        <form onSubmit={onCreateCategory} className="rounded-lg border border-river/15 bg-river/5 p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase text-river">Create category</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={newCategoryName}
              onChange={(event) => onCategoryNameChange(event.target.value)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm"
              placeholder="Category name"
            />
            <select
              value={newCategoryKind}
              onChange={(event) => onCategoryKindChange(event.target.value as TransactionType)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input
              value={newCategoryBudget}
              onChange={(event) => onCategoryBudgetChange(event.target.value)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2"
              inputMode="decimal"
              placeholder="Monthly budget, optional"
            />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-white sm:col-span-2">
              <Plus size={17} />
              Create category
            </button>
          </div>
        </form>

        <form onSubmit={onCreateSubcategory} className="rounded-lg border border-river/15 bg-river/5 p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase text-river">Create subcategory</h3>
          <div className="grid gap-2">
            <select
              value={newSubcategoryCategoryId}
              onChange={(event) => onSubcategoryCategoryChange(event.target.value)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input
              value={newSubcategoryName}
              onChange={(event) => onSubcategoryNameChange(event.target.value)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm"
              placeholder="Subcategory name, e.g. Electricity"
            />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-white">
              <Plus size={17} />
              Create subcategory
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-ink/10 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase text-ink/55">Category library</h3>
            <span className="text-xs font-semibold text-ink/45">{categories.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const childCount = subcategories.filter((subcategory) => subcategory.categoryId === category.id).length;
              const selected = selectedCategory?.id === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setEditingCategoryId("");
                    setEditingSubcategoryId("");
                  }}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selected ? "border-river/25 bg-river/10 text-river" : "border-ink/10 hover:bg-ink/[0.04]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: category.color }} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{category.name}</span>
                      <span className="block text-xs text-ink/45">{category.kind} - {childCount} sub</span>
                    </span>
                  </span>
                  {category.monthlyBudget !== undefined ? <span className="shrink-0 text-xs font-semibold">{currency.format(category.monthlyBudget)}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {categories.filter((category) => !selectedCategory || category.id === selectedCategory.id).map((category) => {
          const children = subcategories.filter((subcategory) => subcategory.categoryId === category.id);
          const isEditingCategory = editingCategoryId === category.id;
          const categoryDraft = categoryDrafts[category.id] ?? {
            name: category.name,
            kind: category.kind,
            monthlyBudget: String(category.monthlyBudget ?? "")
          };
          return (
            <div key={category.id} className={`rounded-lg border p-3 ${isEditingCategory ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
              <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: category.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{category.name}</p>
                    <p className="mt-1 text-xs text-ink/55">
                      {category.kind}{category.monthlyBudget !== undefined ? ` - ${currency.format(category.monthlyBudget)} monthly budget` : ""}
                    </p>
                  </div>
                </div>
                {isEditingCategory ? (
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    onUpdateCategory(category.id, categoryDraft);
                    setEditingCategoryId("");
                  }} className="grid gap-2 md:w-[520px] md:grid-cols-[minmax(0,1fr)_120px_120px_auto_auto]">
                    <input value={categoryDraft.name} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, name: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm font-semibold" placeholder="Category name" />
                    <select value={categoryDraft.kind} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, kind: event.target.value as TransactionType } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <input value={categoryDraft.monthlyBudget} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, monthlyBudget: event.target.value } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Budget" />
                    <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-white">Update</button>
                    <button type="button" aria-label="Cancel category edit" onClick={() => {
                      setEditingCategoryId("");
                      setCategoryDrafts((current) => ({ ...current, [category.id]: { name: category.name, kind: category.kind, monthlyBudget: String(category.monthlyBudget ?? "") } }));
                    }} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <div className="inline-flex justify-end gap-1">
                    <button type="button" aria-label="Edit category" onClick={() => setEditingCategoryId(category.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                      <Pencil size={16} />
                    </button>
                    <button type="button" aria-label="Delete category" onClick={() => onDeleteCategory(category.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                {children.length > 0 ? children.map((subcategory) => {
                  const subcategoryDraft = subcategoryDrafts[subcategory.id] ?? { categoryId: subcategory.categoryId, name: subcategory.name };
                  const isEditingSubcategory = editingSubcategoryId === subcategory.id;

                  return (
                    <div key={subcategory.id} className={`grid gap-2 rounded-lg p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${isEditingSubcategory ? "bg-river/5" : "bg-ink/[0.03]"}`}>
                      <p className="min-w-0 truncate text-sm text-ink/75">{subcategory.name}</p>
                      {isEditingSubcategory ? (
                        <form onSubmit={(event) => {
                          event.preventDefault();
                          onUpdateSubcategory(subcategory.id, subcategoryDraft);
                          setEditingSubcategoryId("");
                        }} className="grid gap-2 sm:w-[420px] sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.6fr)_auto_auto]">
                          <input value={subcategoryDraft.name} onChange={(event) => setSubcategoryDrafts((current) => ({ ...current, [subcategory.id]: { ...subcategoryDraft, name: event.target.value } }))} className="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm" placeholder="Subcategory" />
                          <select value={subcategoryDraft.categoryId} onChange={(event) => setSubcategoryDrafts((current) => ({ ...current, [subcategory.id]: { ...subcategoryDraft, categoryId: event.target.value } }))} className="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                            {categories.map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                          <button className="h-9 rounded-lg bg-river px-3 text-sm font-semibold text-white">Update</button>
                          <button type="button" aria-label="Cancel subcategory edit" onClick={() => {
                            setEditingSubcategoryId("");
                            setSubcategoryDrafts((current) => ({ ...current, [subcategory.id]: { categoryId: subcategory.categoryId, name: subcategory.name } }));
                          }} className="grid size-9 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                            <X size={15} />
                          </button>
                        </form>
                      ) : (
                        <div className="inline-flex justify-end gap-1">
                          <button type="button" aria-label="Edit subcategory" onClick={() => setEditingSubcategoryId(subcategory.id)} className="grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                            <Pencil size={15} />
                          </button>
                          <button type="button" aria-label="Delete subcategory" onClick={() => onDeleteSubcategory(subcategory.id)} className="grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <span className="text-sm text-ink/45">No subcategories yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
            language === item ? "bg-river text-white" : "text-ink/55 hover:bg-river/10 hover:text-river"
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
