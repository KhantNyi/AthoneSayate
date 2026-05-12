"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  Languages,
  LayoutDashboard,
  LineChart,
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
import { format, parseISO } from "date-fns";
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
  monthlyComparison,
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
    searchPlaceholder: "Search note, category, subcategory, account",
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
  { key: "settings", label: "category", icon: Settings }
] as const;

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
  const [editingTransactionId, setEditingTransactionId] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState("");
  const [editingRecurringId, setEditingRecurringId] = useState("");
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

  const monthTx = useMemo(() => monthTransactions(transactions), [transactions]);
  const monthTotals = useMemo(() => totals(monthTx), [monthTx]);
  const allTotals = useMemo(() => totals(transactions), [transactions]);
  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const currentBudgetMonth = format(new Date(), "yyyy-MM");
  const categoriesForCurrentMonth = useMemo(() => applyMonthlyBudgets(categories, budgets, currentBudgetMonth), [categories, budgets, currentBudgetMonth]);
  const categoriesForBudgetMonth = useMemo(() => applyMonthlyBudgets(categories, budgets, budgetMonth), [categories, budgets, budgetMonth]);
  const budgetRows = useMemo(() => categorySpend(categoriesForCurrentMonth, monthTx), [categoriesForCurrentMonth, monthTx]);
  const budgetTabRows = useMemo(() => categorySpend(categoriesForBudgetMonth, monthTx).filter((row) => row.monthlyBudget !== undefined), [categoriesForBudgetMonth, monthTx]);
  const comparison = useMemo(() => monthlyComparison(transactions), [transactions]);
  const daily = useMemo(() => dailySeries(monthTx), [monthTx]);
  const weekday = useMemo(() => weekdaySpend(monthTx), [monthTx]);
  const upcoming = useMemo(() => upcomingRules(recurringRules), [recurringRules]);
  const recurringDue = upcoming.filter((rule) => rule.type === "expense" && rule.daysUntilDue >= 0).reduce((sum, rule) => sum + rule.amount, 0);
  const dailyAllowance = safeToSpend(monthTotals.income, monthTotals.expenses, recurringDue);
  const t = translations[language];
  const categoryLabel = (name?: string) => (language === "my" && name ? categoryTranslations[name] ?? name : name);
  const frequencyLabel = (value: string) => (language === "my" ? frequencyTranslations[value] ?? value : value);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectedSubcategory = subcategories.find((subcategory) => subcategory.id === subcategoryId);
  const canAddTransaction = Boolean(accountId && categoryId && Number(amount) > 0 && !isSaving);

  const filteredTransactions = transactions
    .filter((tx) => {
      const category = categories.find((item) => item.id === tx.categoryId);
      const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
      const account = accounts.find((item) => item.id === tx.accountId);
      const haystack = `${tx.merchant ?? ""} ${tx.notes ?? ""} ${category?.name ?? ""} ${subcategory?.name ?? ""} ${account?.name ?? ""}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    })
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

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
        color: draft.color || "#3d7485"
      });
      setAccounts((current) => current.map((account) => account.id === updated.id ? updated : account));
      setAccountDrafts((current) => ({ ...current, [updated.id]: accountToDraft(updated) }));
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
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition ${
                activeTab === item.key ? "bg-ink text-paper" : "text-ink/70 hover:bg-white hover:text-ink"
              }`}
            >
              <item.icon size={18} />
              {t[item.label]}
            </button>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/94 px-2 py-2 shadow-[0_-12px_30px_rgba(23,32,28,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
          {navItems.filter((item) => ["dashboard", "transactions", "budgets", "recurring", "settings"].includes(item.key)).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium ${
                activeTab === item.key ? "bg-ink text-paper" : "text-ink/65"
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
            <StatusPill tone="moss" label={`${monthTotals.savingsRate.toFixed(1)}% ${t.savingsRate}`} />
          </div>
        </header>

        {(isLoading || dataError || dataNotice) && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            dataError ? "border-coral/25 bg-coral/10 text-coral" : "border-river/20 bg-river/10 text-river"
          }`}>
            {dataError || dataNotice || "Loading Supabase data..."}
          </div>
        )}

        <section id="dashboard" className={activeTab === "dashboard" ? "grid gap-4" : "hidden"}>
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
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `฿${value}`} width={48} />
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

        <section className={activeTab === "transactions" || activeTab === "budgets" || activeTab === "recurring" ? "mt-4 grid gap-4 2xl:grid-cols-[1fr_0.95fr]" : "hidden"}>
          {activeTab === "transactions" && (
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
                  <button disabled={!canAddTransaction} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-45">
                    <Plus size={17} />
                    {isSaving ? "Saving" : t.add}
                  </button>
                  <input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2 lg:col-span-full" placeholder={t.optionalNote} />
                </div>
              </form>
            </div>

            <div className="grid gap-3 lg:hidden">
              {filteredTransactions.slice(0, 14).map((tx) => {
                const category = categories.find((item) => item.id === tx.categoryId);
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
                    const category = categories.find((item) => item.id === tx.categoryId);
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
          </Panel>
          )}

          {(activeTab === "budgets" || activeTab === "recurring") && <div className="grid gap-4">
            {activeTab === "budgets" && (
            <Panel id="budgets" title={t.budgetHealth} action={t.monthlyLimits}>
              <form onSubmit={handleSetBudget} className="mb-4 max-w-2xl rounded-lg border border-river/15 bg-river/5 p-3">
                <h3 className="mb-3 text-sm font-semibold uppercase text-river">Set new monthly budget</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[150px_minmax(0,1fr)_150px]">
                  <input
                    type="month"
                    value={budgetMonth}
                    onChange={(event) => setBudgetMonth(event.target.value)}
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
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-50 sm:col-span-2 lg:col-span-3" disabled={savingBudgetId === budgetCategoryId}>
                    <Plus size={17} />
                    {savingBudgetId === budgetCategoryId ? "Saving budget" : "Save monthly budget"}
                  </button>
                </div>
              </form>
              <div className="space-y-4">
                {budgetTabRows.map((row) => {
                  const isEditing = editingBudgetId === row.id;

                  return (
                  <article key={row.id} className={`rounded-lg border p-3 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
                    <div className="mb-2 grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
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
                    <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(row.progress, 100)}%`, background: row.spent > (row.monthlyBudget ?? Infinity) ? "#bd5b4b" : row.color }} />
                    </div>
                  </article>
                  );
                })}
              </div>
            </Panel>
            )}

            {activeTab === "recurring" && (
            <Panel id="recurring" title={t.recurring} action={`${upcoming.length} ${t.rules}`}>
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
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper sm:col-span-2 lg:col-span-1">
                    <Plus size={17} />
                    Add
                  </button>
                </div>
              </form>
              <div className="space-y-3">
                {upcoming.map((rule) => {
                  const isEditing = editingRecurringId === rule.id;
                  const ruleCategory = categories.find((category) => category.id === rule.categoryId);
                  const ruleSubcategory = subcategories.find((subcategory) => subcategory.id === rule.subcategoryId);
                  const ruleAccount = accounts.find((account) => account.id === rule.accountId);
                  return (
                    <article key={rule.id} className={`rounded-lg border p-3 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{rule.merchant}{ruleSubcategory ? ` / ${ruleSubcategory.name}` : ""}</p>
                          <p className="mt-1 text-sm text-ink/55">
                            {categoryLabel(ruleCategory?.name)} - {ruleAccount?.name} - {frequencyLabel(rule.frequency)} - {t.dueIn} {rule.daysUntilDue}
                            {rule.autoCreate ? " - Auto-create" : ""}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <strong className={`shrink-0 px-2 ${rule.type === "income" ? "text-moss" : "text-coral"}`}>{rule.type === "income" ? "+" : "-"}{currency.format(rule.amount)}</strong>
                          {!isEditing ? (
                            <>
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
            </Panel>
            )}
          </div>}
        </section>

        <section className={activeTab === "goals" || activeTab === "reports" || activeTab === "settings" ? "mt-4 grid gap-4" : "hidden"}>
          {activeTab === "goals" && (
          <Panel id="goals" title={t.goals} action={t.savingsProgress}>
            <form onSubmit={handleCreateGoal} className="mb-4 max-w-3xl rounded-lg border border-ink/10 bg-white p-3">
              <h3 className="mb-3 text-sm font-semibold uppercase text-ink/55">Add savings goal</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_130px_130px_145px]">
                <input value={goalName} onChange={(event) => setGoalName(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" placeholder="Goal name" />
                <input value={goalTargetAmount} onChange={(event) => setGoalTargetAmount(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Target" />
                <input value={goalCurrentAmount} onChange={(event) => setGoalCurrentAmount(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Saved now" />
                <input type="date" value={goalTargetDate} onChange={(event) => setGoalTargetDate(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper sm:col-span-2 lg:col-span-full">
                  <Plus size={17} />
                  Add goal
                </button>
              </div>
            </form>
            <div className="space-y-4">
              {goals.map((goal) => {
                const draft = goalDrafts[goal.id] ?? goalToDraft(goal);

                return (
                <div key={goal.id} className="rounded-lg border border-ink/10 bg-white p-3">
                  <form onSubmit={(event) => handleUpdateGoal(event, goal.id)} className="mb-2 grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="font-medium">{goal.name}</p>
                      <p className="text-ink/60">{currency.format(goal.currentAmount)} / {currency.format(goal.targetAmount)}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 md:w-[520px] md:grid-cols-[minmax(0,1fr)_110px_110px_132px_auto_auto]">
                      <input
                        value={draft.name}
                        onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, name: event.target.value } }))}
                        className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                        placeholder="Name"
                      />
                      <input
                        value={draft.targetAmount}
                        onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, targetAmount: event.target.value } }))}
                        className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                        inputMode="decimal"
                        placeholder="Target"
                      />
                      <input
                        value={draft.currentAmount}
                        onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, currentAmount: event.target.value } }))}
                        className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                        inputMode="decimal"
                        placeholder="Saved"
                      />
                      <input type="date" value={draft.targetDate} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, targetDate: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
                      <button className="h-10 rounded-lg bg-ink px-3 text-sm font-semibold text-paper disabled:opacity-50" disabled={savingGoalId === goal.id}>
                        {savingGoalId === goal.id ? "Saving" : "Save"}
                      </button>
                      <button type="button" aria-label="Delete goal" onClick={() => handleDeleteGoal(goal.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </form>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
                    <div className="h-full rounded-full" style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%`, background: goal.color }} />
                  </div>
                </div>
                );
              })}
            </div>
          </Panel>
          )}

          {activeTab === "reports" && (
          <Panel id="reports" title={t.reports} action={t.weekdayPattern}>
            <div className="h-52 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekday}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,32,28,0.1)" />
                  <XAxis dataKey="weekday" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `฿${value}`} width={44} />
                  <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} />
                  <Bar dataKey="spent" fill="#c3833d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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

                    return (
                      <form key={account.id} onSubmit={(event) => handleUpdateAccount(event, account.id)} className="grid gap-2 rounded-lg border border-ink/10 p-2 md:grid-cols-[minmax(0,1fr)_140px_130px_92px_110px_auto] md:items-center">
                        <div className="min-w-0">
                          <input
                            value={draft.name}
                            onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, name: event.target.value } }))}
                            className="h-10 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm font-semibold"
                            placeholder="Account name"
                          />
                          <p className="mt-1 text-xs text-ink/55">Current balance: {currency.format(account.balance)}</p>
                        </div>
                        <select
                          value={draft.type}
                          onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, type: event.target.value as AccountType } }))}
                          className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                        >
                          <option value="cash">Cash</option>
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                          <option value="credit_card">Credit card</option>
                          <option value="wallet">Wallet</option>
                          <option value="investment">Investment</option>
                        </select>
                        <input
                          value={draft.openingBalance}
                          onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, openingBalance: event.target.value } }))}
                          className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                          inputMode="decimal"
                          placeholder="Opening"
                        />
                        <input
                          type="color"
                          value={draft.color}
                          onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, color: event.target.value } }))}
                          className="h-10 w-full rounded-lg border border-ink/10 bg-white px-2"
                          aria-label="Account color"
                        />
                        <button className="h-10 rounded-lg bg-ink px-3 text-sm font-semibold text-paper disabled:opacity-50" disabled={savingAccountId === account.id}>
                          {savingAccountId === account.id ? "Saving" : "Save"}
                        </button>
                        <button type="button" aria-label="Delete account" onClick={() => handleDeleteAccount(account.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                          <Trash2 size={16} />
                        </button>
                      </form>
                    );
                  })}
                </div>
              </div>

              <CategoryManager
                categories={categories}
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
    <section id={id} className="rounded-lg border border-ink/10 bg-paper/78 p-3 shadow-soft backdrop-blur sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        <span className="text-sm text-ink/55">{action}</span>
      </div>
      {children}
    </section>
  );
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

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-4">
        <form onSubmit={onCreateCategory} className="rounded-lg border border-ink/10 bg-white p-3">
          <h3 className="mb-3 font-semibold">Create category</h3>
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
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper sm:col-span-2">
              <Plus size={17} />
              Create category
            </button>
          </div>
        </form>

        <form onSubmit={onCreateSubcategory} className="rounded-lg border border-ink/10 bg-white p-3">
          <h3 className="mb-3 font-semibold">Create subcategory</h3>
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
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper">
              <Plus size={17} />
              Create subcategory
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {categories.map((category) => {
          const children = subcategories.filter((subcategory) => subcategory.categoryId === category.id);
          const categoryDraft = categoryDrafts[category.id] ?? {
            name: category.name,
            kind: category.kind,
            monthlyBudget: String(category.monthlyBudget ?? "")
          };
          return (
            <div key={category.id} className="rounded-lg border border-ink/10 bg-white p-3">
              <form onSubmit={(event) => {
                event.preventDefault();
                onUpdateCategory(category.id, categoryDraft);
              }} className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_120px_auto_auto]">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: category.color }} />
                  <input
                    value={categoryDraft.name}
                    onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, name: event.target.value } }))}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 text-sm font-semibold"
                    placeholder="Category name"
                  />
                </div>
                <select
                  value={categoryDraft.kind}
                  onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, kind: event.target.value as TransactionType } }))}
                  className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <input
                  value={categoryDraft.monthlyBudget}
                  onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, monthlyBudget: event.target.value } }))}
                  className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                  inputMode="decimal"
                  placeholder="Budget"
                />
                <button className="h-10 rounded-lg bg-ink px-3 text-sm font-semibold text-paper">Save</button>
                <button type="button" aria-label="Delete category" onClick={() => onDeleteCategory(category.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                  <Trash2 size={16} />
                </button>
              </form>
              <div className="grid gap-2">
                {children.length > 0 ? children.map((subcategory) => (
                  <form key={subcategory.id} onSubmit={(event) => {
                    event.preventDefault();
                    onUpdateSubcategory(subcategory.id, subcategoryDrafts[subcategory.id] ?? { categoryId: subcategory.categoryId, name: subcategory.name });
                  }} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.6fr)_auto_auto]">
                    <input
                      value={subcategoryDrafts[subcategory.id]?.name ?? subcategory.name}
                      onChange={(event) => setSubcategoryDrafts((current) => ({ ...current, [subcategory.id]: { ...(current[subcategory.id] ?? { categoryId: subcategory.categoryId, name: subcategory.name }), name: event.target.value } }))}
                      className="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                      placeholder="Subcategory"
                    />
                    <select
                      value={subcategoryDrafts[subcategory.id]?.categoryId ?? subcategory.categoryId}
                      onChange={(event) => setSubcategoryDrafts((current) => ({ ...current, [subcategory.id]: { ...(current[subcategory.id] ?? { categoryId: subcategory.categoryId, name: subcategory.name }), categoryId: event.target.value } }))}
                      className="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm"
                    >
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <button className="h-9 rounded-lg bg-ink px-3 text-sm font-semibold text-paper">Save</button>
                    <button type="button" aria-label="Delete subcategory" onClick={() => onDeleteSubcategory(subcategory.id)} className="grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                      <Trash2 size={15} />
                    </button>
                  </form>
                )) : (
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
