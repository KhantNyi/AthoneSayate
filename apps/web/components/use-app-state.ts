"use client";

import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  loadExpenseData,
  DEMO_WRITE_BLOCKED,
  isDemoMode,
  removeMonthlyBudget,
  removeTransaction,
  setQueueDrainedCallback,
  subscribeSyncState,
  updateAccount,
  updateCategory,
  updateCategoryBudget,
  updateTransaction,
  updateGoal,
  upsertMonthlyBudget,
  updateRecurringRule,
  updateSubcategory,
  type SyncState
} from "@/lib/offline-data";
import {
  accountBalances,
  categorySpend,
  dailySeries,
  forecastMonthlyExpenses,
  frequentCategories,
  frequentSubcategories,
  monthTransactions,
  safeToSpend,
  totals,
  upcomingRules
} from "@athonesayate/shared/metrics";
import {
  advanceRecurringDate,
  findRecurringPayment,
  normalizedNextDueOn,
  recurringPaymentNote
} from "@athonesayate/shared/recurring";
import type { Account, Budget, Category, Goal, RecurringRule, Subcategory, Transaction, TransactionType } from "@athonesayate/shared/types";
import {
  accountToDraft,
  goalToDraft,
  recurringRuleToDraft,
  transactionToDraft,
  type AccountDraft,
  type GoalDraft,
  type RecurringDraft,
  type TransactionDraft
} from "@/lib/drafts";
import {
  summarizeActivityRange,
  summarizeRecurringByDay,
  summarizeRecurringCalendarByDay,
  summarizeTransactionsByDay,
  mergeCalendarSummaries
} from "@/lib/calendar-utils";
import { applyCategoryDisplayColors, applyMonthlyBudgets, monthlyComparisonForMonth, percentDelta, upsertBudgetInState } from "@/lib/helpers";
import { categoryTranslations, frequencyTranslations, translations, uiTranslations, type Language } from "@/lib/i18n";
import {
  validateAccount,
  validateBudget,
  validateCategory,
  validateGoal,
  validateRecurring,
  validateSubcategory,
  validateTransaction,
  type RequirementFix,
  type ValidationResult
} from "@/lib/validation";
import { navItems, type TabKey } from "./nav";

type LastRecurringPayment = {
  transaction: Transaction;
  previousRule: RecurringRule;
  updatedRule: RecurringRule;
  notice: string;
};

/** Why an action could not complete, plus where to go to unblock it. */
type ActionAlert = { message: string; fix?: RequirementFix };

/** Forms whose field-level requirements are shown only after a failed attempt. */
type FormKey = "transaction" | "recurring" | "goal" | "category" | "subcategory" | "budget";

export function useAppState() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataErrorRaw] = useState("");
  const [dataNotice, setDataNotice] = useState("");
  const [actionAlert, setActionAlert] = useState<ActionAlert | null>(null);
  const [attemptedForms, setAttemptedForms] = useState<Partial<Record<FormKey, boolean>>>({});
  const [signUpPromptOpen, setSignUpPromptOpen] = useState(false);

  // dataError covers the whole screen failing to load; a single action that
  // fails reports through reportFailure instead, so the explanation follows the
  // user rather than sitting in a banner they have scrolled past.
  const setDataError = useCallback((message: string) => {
    if (message === DEMO_WRITE_BLOCKED) {
      setSignUpPromptOpen(true);
      setDataErrorRaw("");
      return;
    }
    setDataErrorRaw(message);
  }, []);

  const clearActionAlert = useCallback(() => setActionAlert(null), []);

  /**
   * Says why an action could not complete. Every command handler funnels
   * failures through here, so a blocked demo write is intercepted once rather
   * than in each of them.
   */
  const reportFailure = useCallback((message: string, fix?: RequirementFix) => {
    if (message === DEMO_WRITE_BLOCKED) {
      setSignUpPromptOpen(true);
      setActionAlert(null);
      return;
    }
    setDataNotice("");
    setActionAlert({ message, fix });
  }, []);

  const reportError = useCallback((error: unknown, fallback: string) => {
    reportFailure(error instanceof Error ? error.message : fallback);
  }, [reportFailure]);

  /** Reports the unmet requirements of a form and remembers to keep showing them. */
  const reportBlocked = useCallback((form: FormKey, result: ValidationResult) => {
    setAttemptedForms((current) => ({ ...current, [form]: true }));
    reportFailure(result.message, result.fix);
  }, [reportFailure]);

  const clearAttempt = useCallback((form: FormKey) => {
    setAttemptedForms((current) => (current[form] ? { ...current, [form]: false } : current));
  }, []);
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
  const [monthlyReportMonth, setMonthlyReportMonth] = useState(startOfMonth(new Date()));
  const [monthlyReportMode, setMonthlyReportMode] = useState<"overview" | "compare">("overview");
  const [monthlyCompareMonth, setMonthlyCompareMonth] = useState(startOfMonth(subMonths(new Date(), 1)));
  const [monthlyReportCategoryId, setMonthlyReportCategoryId] = useState("all");
  const [monthlyReportSubcategoryId, setMonthlyReportSubcategoryId] = useState("all");
  const [monthlyReportAccountId, setMonthlyReportAccountId] = useState("all");
  const [monthlyReportRecurringFilter, setMonthlyReportRecurringFilter] = useState<"all" | "recurring" | "manual">("all");
  const [monthlyReportQuery, setMonthlyReportQuery] = useState("");
  const [monthlyReportFiltersOpen, setMonthlyReportFiltersOpen] = useState(false);
  const [selectedTransactionDate, setSelectedTransactionDate] = useState("");
  const [selectedRecurringDate, setSelectedRecurringDate] = useState("");
  const [selectedDashboardDate, setSelectedDashboardDate] = useState("");
  const [query, setQuery] = useState("");
  const [txFilterType, setTxFilterType] = useState<"all" | TransactionType>("all");
  const [txFilterCategoryId, setTxFilterCategoryId] = useState("all");
  const [txFilterAccountId, setTxFilterAccountId] = useState("all");
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
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [syncState, setSyncState] = useState<SyncState>({ online: true, pending: 0, syncing: false });
  const [usingCachedData, setUsingCachedData] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  // PWA quick-add shortcut: launching with ?action=quick-add opens the sheet.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "quick-add") {
      setQuickAddOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setQuickAddOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable)) {
        return;
      }
      if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setQuickAddOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = quickAddOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [quickAddOpen]);

  useEffect(() => {
    if (!dataNotice) {
      return;
    }
    const hasUndo = Boolean(lastRecurringPayment && dataNotice === lastRecurringPayment.notice);
    const timeout = window.setTimeout(() => setDataNotice(""), hasUndo ? 12000 : 6000);
    return () => window.clearTimeout(timeout);
  }, [dataNotice, lastRecurringPayment]);

  useEffect(() => {
    if (!actionAlert) {
      return;
    }
    // Longer than a success notice: this one has something to read and act on.
    const timeout = window.setTimeout(() => setActionAlert(null), 10000);
    return () => window.clearTimeout(timeout);
  }, [actionAlert]);

  const loadData = useCallback(async ({ initial }: { initial: boolean }) => {
    try {
      if (initial) {
        setIsLoading(true);
      }
      setDataError("");
      const { data, fromCache } = await loadExpenseData();
      setUsingCachedData(fromCache);

      setAccounts(data.accounts);
      setAccountDrafts(Object.fromEntries(data.accounts.map((account) => [account.id, accountToDraft(account)])));
      setBudgets(data.budgets);
      setCategories(data.categories);
      setSubcategories(data.subcategories);
      setGoals(data.goals);
      setRecurringRules(data.recurringRules);
      setTransactions(data.transactions);
      setTransactionDrafts(Object.fromEntries(data.transactions.map((transaction) => [transaction.id, transactionToDraft(transaction)])));
      setRecurringDrafts(Object.fromEntries(data.recurringRules.map((rule) => [rule.id, recurringRuleToDraft(rule)])));
      setGoalDrafts(Object.fromEntries(data.goals.map((goal) => [goal.id, goalToDraft(goal)])));

      if (initial) {
        setAccountId(data.accounts[0]?.id ?? "");
        setCategoryId(frequentCategories(data.categories, data.transactions, "expense")[0]?.id ?? "");
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
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to load Supabase data.");
    } finally {
      if (initial) {
        setIsLoading(false);
      }
    }
  }, [setDataError]);

  useEffect(() => {
    void loadData({ initial: true });
  }, [loadData]);

  // Offline sync: track connectivity/queue state and refetch after a queued
  // batch of offline changes replays against the server.
  useEffect(() => {
    const unsubscribe = subscribeSyncState(setSyncState);
    setQueueDrainedCallback(() => {
      setDataNotice("Offline changes synced.");
      setUsingCachedData(false);
      void loadData({ initial: false });
    });
    return () => {
      unsubscribe();
      setQueueDrainedCallback(null);
    };
  }, [loadData]);

  useEffect(() => {
    const currentCategory = categories.find((category) => category.id === categoryId);

    if (currentCategory?.kind !== type) {
      setCategoryId(frequentCategories(categories, transactions, type)[0]?.id ?? "");
    }
  }, [categories, categoryId, transactions, type]);

  useEffect(() => {
    const categorySubcategories = frequentSubcategories(subcategories, transactions, categoryId);

    if (!categorySubcategories.some((item) => item.id === subcategoryId)) {
      setSubcategoryId(categorySubcategories[0]?.id ?? "");
    }
  }, [categoryId, subcategories, subcategoryId, transactions]);

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

  useEffect(() => {
    setMobileMoreOpen(false);
    setMonthlyReportFiltersOpen(false);
  }, [activeTab]);

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
  const quickAddCategories = useMemo(() => frequentCategories(displayCategories, transactions, type), [displayCategories, transactions, type]);
  const quickAddSubcategories = useMemo(() => frequentSubcategories(subcategories, transactions, categoryId), [categoryId, subcategories, transactions]);
  const categoriesForCurrentMonth = useMemo(() => applyMonthlyBudgets(displayCategories, budgets, dashboardCategoryMonthKey), [displayCategories, budgets, dashboardCategoryMonthKey]);
  const categoriesForBudgetMonth = useMemo(() => applyMonthlyBudgets(displayCategories, budgets, budgetMonth), [displayCategories, budgets, budgetMonth]);
  const budgetMonthTx = useMemo(() => monthTransactions(transactions, visibleMonth), [transactions, visibleMonth]);
  const dashboardCategoryTx = useMemo(() => monthTransactions(transactions, dashboardCategoryMonth), [transactions, dashboardCategoryMonth]);
  const budgetRows = useMemo(() => categorySpend(categoriesForCurrentMonth, dashboardCategoryTx), [categoriesForCurrentMonth, dashboardCategoryTx]);
  const budgetTabRows = useMemo(() => categorySpend(categoriesForBudgetMonth, budgetMonthTx).filter((row) => row.monthlyBudget !== undefined), [categoriesForBudgetMonth, budgetMonthTx]);
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
  const dashboardInsights = useMemo(() => {
    const expenses = dashboardStatsTx.filter((tx) => tx.type === "expense");
    const totalSpent = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const byCategory = new Map<string, number>();

    for (const tx of expenses) {
      if (tx.categoryId) {
        byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount);
      }
    }

    let topCategoryId = "";
    let topCategorySpent = 0;
    byCategory.forEach((spent, id) => {
      if (spent > topCategorySpent) {
        topCategorySpent = spent;
        topCategoryId = id;
      }
    });

    const biggest = expenses.reduce<Transaction | null>((max, tx) => (tx.amount > (max?.amount ?? 0) ? tx : max), null);
    const monthStart = startOfMonth(dashboardStatsMonth);
    const monthEnd = endOfMonth(dashboardStatsMonth);
    const today = new Date();
    const lastCountedDay = today < monthEnd ? today : monthEnd;
    const elapsedDays = lastCountedDay >= monthStart ? eachDayOfInterval({ start: monthStart, end: lastCountedDay }).length : 0;
    const spendDays = new Set(expenses.map((tx) => tx.occurredOn)).size;

    return {
      totalSpent,
      topCategoryId,
      topCategorySpent,
      topShare: totalSpent > 0 ? (topCategorySpent / totalSpent) * 100 : 0,
      biggest,
      noSpendDays: Math.max(elapsedDays - spendDays, 0),
      hasElapsedDays: elapsedDays > 0
    };
  }, [dashboardStatsTx, dashboardStatsMonth]);
  const dashboardPaceTx = useMemo(() => monthTransactions(transactions, dashboardPaceMonth), [transactions, dashboardPaceMonth]);
  const daily = useMemo(() => dailySeries(dashboardPaceTx, dashboardPaceMonth), [dashboardPaceTx, dashboardPaceMonth]);
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
  // Recurring rules with stale due dates caught up to the present, so a bill
  // that slipped into a past month still shows (and pays) as this month's.
  const scheduledRules = useMemo(() => recurringRules.map((rule) => ({ ...rule, nextDueOn: normalizedNextDueOn(rule) })), [recurringRules]);
  const liveRecurringIds = useMemo(() => new Set(recurringRules.map((rule) => rule.id)), [recurringRules]);
  const upcoming = useMemo(() => upcomingRules(scheduledRules), [scheduledRules]);
  const recurringPayments = useMemo(() => upcoming.reduce<Record<string, Transaction | undefined>>((matches, rule) => ({
    ...matches,
    [rule.id]: findRecurringPayment(rule, transactions, new Date(), liveRecurringIds)
  }), {}), [transactions, upcoming, liveRecurringIds]);
  const recurringDue = useMemo(() => {
    const monthEnd = endOfMonth(new Date());
    const today = format(new Date(), "yyyy-MM-dd");

    return upcoming
      .filter((rule) => rule.type === "expense")
      .reduce((sum, rule) => {
        let due = parseISO(rule.nextDueOn);
        let occurrenceIndex = 0;
        let ruleTotal = 0;

        while (due <= monthEnd) {
          const recordedPayment = recurringPayments[rule.id];
          if (occurrenceIndex > 0 || !recordedPayment || recordedPayment.occurredOn > today) {
            ruleTotal += rule.amount;
          }
          due = advanceRecurringDate(due, rule.frequency);
          occurrenceIndex += 1;
        }

        return sum + ruleTotal;
      }, 0);
  }, [recurringPayments, upcoming]);
  const expenseForecast = useMemo(() => forecastMonthlyExpenses(transactions, recurringDue), [recurringDue, transactions]);
  const dailyAllowance = safeToSpend(currentMonthTotals.income, currentMonthTotals.expenses, recurringDue);
  const t = translations[language];
  const ui = uiTranslations[language];
  const isDark = theme === "dark";
  const chart = useMemo(() => ({
    expense: isDark ? "#ff6e54" : "#ea4c2e",
    income: isDark ? "#3ec874" : "#16a34a",
    grid: isDark ? "rgba(226,233,246,0.08)" : "rgba(23,32,51,0.08)",
    tooltip: {
      contentStyle: {
        background: isDark ? "#1b2542" : "#ffffff",
        border: isDark ? "1px solid rgba(226,233,246,0.14)" : "1px solid rgba(23,32,51,0.08)",
        borderRadius: 12,
        boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.5)" : "0 16px 40px rgba(15,23,42,0.14)",
        color: isDark ? "#e2e9f6" : "#172033",
        fontSize: 13
      },
      labelStyle: { color: isDark ? "#e2e9f6" : "#172033", fontWeight: 600 },
      itemStyle: { color: isDark ? "#e2e9f6" : "#172033" }
    }
  }), [isDark]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("athonesayate-theme", next);
    } catch {
      // private mode: theme just won't persist
    }
  }

  const categoryLabel = (name?: string) => (language === "my" && name ? categoryTranslations[name] ?? name : name);
  const frequencyLabel = (value: string) => (language === "my" ? frequencyTranslations[value] ?? value : value);
  const activeNavItem = navItems.find((item) => item.key === activeTab) ?? navItems[0];
  const mobilePrimaryNavItems = navItems.filter((item) => ["dashboard", "transactions", "reports", "recurring"].includes(item.key));
  const mobileMoreNavItems = navItems.filter((item) => ["budgets", "goals", "settings"].includes(item.key));
  const mobileMoreActive = mobileMoreNavItems.some((item) => item.key === activeTab);
  const monthlyReportSelectedCategory = displayCategories.find((category) => category.id === monthlyReportCategoryId);
  const monthlyReportSelectedSubcategory = subcategories.find((subcategory) => subcategory.id === monthlyReportSubcategoryId);
  const monthlyReportSelectedAccount = accounts.find((account) => account.id === monthlyReportAccountId);
  const monthlyReportFilterCount = [
    monthlyReportCategoryId !== "all",
    monthlyReportSubcategoryId !== "all",
    monthlyReportAccountId !== "all",
    monthlyReportRecurringFilter !== "all",
    monthlyReportQuery.trim().length > 0
  ].filter(Boolean).length;
  const monthlyReportFilterChips = [
    monthlyReportCategoryId !== "all" ? categoryLabel(monthlyReportSelectedCategory?.name) ?? "Category" : "",
    monthlyReportSubcategoryId !== "all" ? monthlyReportSelectedSubcategory?.name ?? "Subcategory" : "",
    monthlyReportAccountId !== "all" ? monthlyReportSelectedAccount?.name ?? "Account" : "",
    monthlyReportRecurringFilter !== "all" ? (monthlyReportRecurringFilter === "recurring" ? "Recurring" : "Manual") : "",
    monthlyReportQuery.trim() ? `"${monthlyReportQuery.trim()}"` : ""
  ].filter(Boolean);
  const selectedCategory = displayCategories.find((category) => category.id === categoryId);
  const selectedSubcategory = subcategories.find((subcategory) => subcategory.id === subcategoryId);

  // One source of truth per form: the submit handler refuses on it and the form
  // itself renders it, so what blocks the button is always spelled out.
  const formIssues: Record<FormKey, ValidationResult> = {
    transaction: validateTransaction({
      action: "add this transaction",
      type,
      amount,
      categoryId,
      accountId,
      categories,
      accountCount: accounts.length
    }),
    recurring: validateRecurring({
      action: "add this recurring item",
      type: recurringType,
      name: recurringName,
      amount: recurringAmount,
      categoryId: recurringCategoryId,
      accountId: recurringAccountId,
      nextDueOn: recurringNextDueOn,
      categories,
      accountCount: accounts.length
    }),
    goal: validateGoal({ action: "add this goal", name: goalName, targetAmount: goalTargetAmount }),
    category: validateCategory({ action: "create this category", name: newCategoryName, monthlyBudget: newCategoryBudget }),
    subcategory: validateSubcategory({
      action: "create this subcategory",
      name: newSubcategoryName,
      categoryId: newSubcategoryCategoryId,
      categoryCount: categories.length
    }),
    budget: validateBudget({
      action: "save this budget",
      categoryId: budgetCategoryId,
      amount: budgetAmount,
      expenseCategoryCount: categories.filter((category) => category.kind === "expense").length
    })
  };
  const formAttempted = (form: FormKey) => Boolean(attemptedForms[form]);
  const transactionCalendarDays = useMemo(() => summarizeTransactionsByDay(transactions.filter((tx) => tx.occurredOn.startsWith(visibleMonthKey))), [transactions, visibleMonthKey]);
  const visibleRecurringPayments = useMemo(() => upcoming.reduce<Record<string, Transaction | undefined>>((matches, rule) => ({
    ...matches,
    [rule.id]: findRecurringPayment(rule, transactions, visibleMonth, liveRecurringIds)
  }), {}), [transactions, upcoming, visibleMonth, liveRecurringIds]);
  const recurringCalendarDays = useMemo(() => summarizeRecurringCalendarByDay(upcoming, transactions, visibleRecurringPayments, visibleMonthKey), [transactions, upcoming, visibleMonthKey, visibleRecurringPayments]);
  const dashboardCalendarTransactionDays = useMemo(() => summarizeTransactionsByDay(transactions.filter((tx) => tx.occurredOn.startsWith(dashboardCalendarMonthKey))), [transactions, dashboardCalendarMonthKey]);
  const dashboardCalendarRecurringDays = useMemo(() => summarizeRecurringByDay(scheduledRules.filter((rule) => rule.nextDueOn.startsWith(dashboardCalendarMonthKey))), [scheduledRules, dashboardCalendarMonthKey]);
  const dashboardCalendarDays = useMemo(() => mergeCalendarSummaries(dashboardCalendarTransactionDays, dashboardCalendarRecurringDays), [dashboardCalendarTransactionDays, dashboardCalendarRecurringDays]);
  const dashboardSelectedSummary = selectedDashboardDate ? dashboardCalendarDays[selectedDashboardDate] : undefined;
  const dashboardMonthSummary = useMemo(() => summarizeActivityRange(transactions, scheduledRules, startOfMonth(dashboardCalendarMonth), endOfMonth(dashboardCalendarMonth)), [transactions, scheduledRules, dashboardCalendarMonth]);
  const dashboardWeekSummary = useMemo(() => {
    const selectedDay = selectedDashboardDate ? parseISO(selectedDashboardDate) : new Date();
    return summarizeActivityRange(transactions, scheduledRules, startOfWeek(selectedDay), endOfWeek(selectedDay));
  }, [transactions, scheduledRules, selectedDashboardDate]);
  const txFilterCount = [
    txFilterType !== "all",
    txFilterCategoryId !== "all",
    txFilterAccountId !== "all"
  ].filter(Boolean).length;
  const filteredTransactions = transactions
    .filter((tx) => {
      const category = displayCategories.find((item) => item.id === tx.categoryId);
      const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
      const account = accounts.find((item) => item.id === tx.accountId);
      const haystack = `${tx.merchant ?? ""} ${tx.notes ?? ""} ${category?.name ?? ""} ${subcategory?.name ?? ""} ${account?.name ?? ""}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesDate = selectedTransactionDate ? tx.occurredOn === selectedTransactionDate : true;
      const matchesType = txFilterType === "all" || tx.type === txFilterType;
      const matchesCategory = txFilterCategoryId === "all" || tx.categoryId === txFilterCategoryId;
      const matchesAccount = txFilterAccountId === "all" || tx.accountId === txFilterAccountId;
      return matchesQuery && matchesDate && matchesType && matchesCategory && matchesAccount;
    })
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

  function clearTransactionFilters() {
    setQuery("");
    setTxFilterType("all");
    setTxFilterCategoryId("all");
    setTxFilterAccountId("all");
  }

  function changeMonthlyReportMonth(month: Date) {
    const previousDefault = subMonths(monthlyReportMonth, 1);
    setMonthlyReportMonth(month);
    setMonthlyCompareMonth((current) => (isSameMonth(current, previousDefault) ? subMonths(month, 1) : current));
  }

  function changeDashboardMonth(month: Date) {
    const normalized = startOfMonth(month);
    setDashboardStatsMonth(normalized);
    setDashboardPaceMonth(normalized);
    setDashboardCategoryMonth(normalized);
    setDashboardCalendarMonth(normalized);
    setDashboardConcentrationMonth(normalized);
    setSelectedDashboardDate("");
  }

  function chooseTab(tab: TabKey) {
    setActiveTab(tab);
    setMobileMoreOpen(false);
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

    if (!formIssues.transaction.ok) {
      reportBlocked("transaction", formIssues.transaction);
      return false;
    }

    const parsedAmount = Number(amount);

    try {
      setIsSaving(true);
      clearActionAlert();
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
      clearAttempt("transaction");
      return true;
    } catch (error) {
      reportError(error, "Unable to save transaction.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuickAdd(event: FormEvent<HTMLFormElement>) {
    const savedType = type;
    const saved = await handleSubmit(event);

    if (saved) {
      setQuickAddOpen(false);
      setDataNotice(savedType === "income" ? "Income recorded." : "Expense recorded.");
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
    const issues = validateTransaction({
      action: "update this transaction",
      type: draft.type,
      amount: draft.amount,
      categoryId: draft.categoryId,
      accountId: draft.accountId,
      categories,
      accountCount: accounts.length
    });

    if (!issues.ok) {
      reportFailure(issues.message, issues.fix);
      return;
    }

    try {
      setSavingTransactionId(transaction.id);
      clearActionAlert();
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
      reportError(error, "Unable to update transaction.");
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
      clearActionAlert();
      await removeTransaction(id);
    } catch (error) {
      setTransactions(previous);
      setTransactionDrafts(previousDrafts);
      reportError(error, "Unable to delete transaction.");
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formIssues.category.ok) {
      reportBlocked("category", formIssues.category);
      return;
    }

    try {
      clearActionAlert();
      const category = await createCategory({
        name: newCategoryName.trim(),
        kind: newCategoryKind,
        monthlyBudget: Number(newCategoryBudget) || undefined
      });
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      setNewCategoryBudget("");
      setNewSubcategoryCategoryId(category.id);
      clearAttempt("category");
      setDataNotice(`${category.name} added to your ${category.kind} categories.`);
    } catch (error) {
      reportError(error, "Unable to create category.");
    }
  }

  async function handleCreateSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formIssues.subcategory.ok) {
      reportBlocked("subcategory", formIssues.subcategory);
      return;
    }

    try {
      clearActionAlert();
      const subcategory = await createSubcategory({
        categoryId: newSubcategoryCategoryId,
        name: newSubcategoryName.trim()
      });
      setSubcategories((current) => [...current, subcategory].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSubcategoryName("");
      clearAttempt("subcategory");
      setDataNotice(`${subcategory.name} added.`);
    } catch (error) {
      reportError(error, "Unable to create subcategory.");
    }
  }

  async function handleSaveBudget(event: FormEvent<HTMLFormElement>, categoryIdToUpdate: string) {
    event.preventDefault();
    const draft = budgetDrafts[categoryIdToUpdate] ?? "";
    const parsedBudget = Number(draft.trim());
    const issues = validateBudget({
      action: "update this budget",
      categoryId: categoryIdToUpdate,
      amount: draft,
      expenseCategoryCount: categories.filter((category) => category.kind === "expense").length
    });

    if (!issues.ok) {
      reportFailure(issues.message, issues.fix);
      return;
    }

    try {
      clearActionAlert();
      setDataNotice("");
      setSavingBudgetId(categoryIdToUpdate);
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
      reportError(error, "Unable to update budget.");
    } finally {
      setSavingBudgetId("");
    }
  }

  async function handleSetBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formIssues.budget.ok) {
      reportBlocked("budget", formIssues.budget);
      return;
    }

    const parsedBudget = Number(budgetAmount.trim());

    try {
      clearActionAlert();
      setDataNotice("");
      setSavingBudgetId(budgetCategoryId);
      const updated = await upsertMonthlyBudget({
        categoryId: budgetCategoryId,
        month: `${budgetMonth}-01`,
        amount: parsedBudget
      });
      const category = categories.find((item) => item.id === budgetCategoryId);
      setBudgets((current) => upsertBudgetInState(current, updated));
      setBudgetDrafts((current) => ({ ...current, [updated.categoryId]: String(updated.amount) }));
      setBudgetAmount(String(updated.amount));
      clearAttempt("budget");
      setDataNotice(`Budget saved for ${category?.name ?? "category"} in ${budgetMonth}.`);
    } catch (error) {
      reportError(error, "Unable to update budget.");
    } finally {
      setSavingBudgetId("");
    }
  }

  async function handleCreateRecurring(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formIssues.recurring.ok) {
      reportBlocked("recurring", formIssues.recurring);
      return;
    }

    const parsedAmount = Number(recurringAmount);

    try {
      clearActionAlert();
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
      clearAttempt("recurring");
      setDataNotice(`${rule.merchant} added to your recurring items.`);
    } catch (error) {
      reportError(error, "Unable to create recurring item.");
    }
  }

  async function handleCreateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formIssues.goal.ok) {
      reportBlocked("goal", formIssues.goal);
      return;
    }

    const parsedTarget = Number(goalTargetAmount);
    const parsedCurrent = Number(goalCurrentAmount) || 0;

    try {
      clearActionAlert();
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
      clearAttempt("goal");
      setDataNotice(`${goal.name} added to your goals.`);
    } catch (error) {
      reportError(error, "Unable to create goal.");
    }
  }

  async function handleUpdateGoal(event: FormEvent<HTMLFormElement>, goalId: string) {
    event.preventDefault();
    const draft = goalDrafts[goalId];
    const parsedTarget = Number(draft?.targetAmount);
    const parsedCurrent = Number(draft?.currentAmount) || 0;
    const issues = validateGoal({
      action: "update this goal",
      name: draft?.name ?? "",
      targetAmount: draft?.targetAmount ?? ""
    });

    if (!draft || !issues.ok) {
      reportFailure(issues.message || "Can't update this goal yet — reopen it and try again.", issues.fix);
      return;
    }

    try {
      clearActionAlert();
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
      reportError(error, "Unable to update goal.");
    } finally {
      setSavingGoalId("");
    }
  }

  async function handleDeleteBudget(categoryIdToDelete: string) {
    const category = categories.find((item) => item.id === categoryIdToDelete);
    const categoryBudgets = budgets.filter((item) => item.categoryId === categoryIdToDelete);

    if (!category) {
      reportFailure("Can't remove this budget — its category is no longer in your list. Refresh and try again.");
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
      clearActionAlert();
      setSavingBudgetId(categoryIdToDelete);
      await Promise.all([
        category.monthlyBudget !== undefined ? updateCategoryBudget(categoryIdToDelete, null) : Promise.resolve(),
        ...categoryBudgets.map((budget) => removeMonthlyBudget(budget.id))
      ]);
      setDataNotice(`${category.name} removed from budgets.`);
    } catch (error) {
      setCategories(previousCategories);
      setBudgets(previousBudgets);
      reportError(error, "Unable to remove budget category.");
    } finally {
      setSavingBudgetId("");
    }
  }

  async function handleUpdateRecurring(event: FormEvent<HTMLFormElement>, ruleId: string) {
    event.preventDefault();
    const draft = recurringDrafts[ruleId];
    const parsedAmount = Number(draft?.amount);
    const issues = validateRecurring({
      action: "update this recurring item",
      type: draft?.type ?? "expense",
      name: draft?.merchant ?? "",
      amount: draft?.amount ?? "",
      categoryId: draft?.categoryId ?? "",
      accountId: draft?.accountId ?? "",
      nextDueOn: draft?.nextDueOn ?? "",
      categories,
      accountCount: accounts.length
    });

    if (!draft || !issues.ok) {
      reportFailure(issues.message || "Can't update this recurring item yet — reopen it and try again.", issues.fix);
      return;
    }

    try {
      clearActionAlert();
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
      reportError(error, "Unable to update recurring item.");
    } finally {
      setSavingRecurringId("");
    }
  }

  async function handleMarkRecurringPaid(rule: RecurringRule) {
    if (!rule.categoryId) {
      reportFailure(`Can't record ${rule.merchant} yet — give it a category first (edit the item and pick one).`);
      return;
    }

    if (!rule.accountId) {
      reportFailure(`Can't record ${rule.merchant} yet — give it an account first (edit the item and pick one).`);
      return;
    }

    try {
      clearActionAlert();
      setDataNotice("");
      setSavingRecurringId(rule.id);
      // Pay the cycle currently in view (a stale schedule catches up to this
      // month first), then advance the schedule one period past it.
      const dueOn = normalizedNextDueOn(rule);
      const transaction = await createTransaction({
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        type: rule.type,
        amount: rule.amount,
        occurredOn: format(new Date(), "yyyy-MM-dd"),
        merchant: rule.merchant,
        notes: recurringPaymentNote(dueOn),
        isRecurring: true,
        recurringRuleId: rule.id,
        recurringDueOn: dueOn
      });
      const updatedRule = await updateRecurringRule(rule.id, {
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        type: rule.type,
        amount: rule.amount,
        merchant: rule.merchant,
        frequency: rule.frequency,
        nextDueOn: format(advanceRecurringDate(parseISO(dueOn), rule.frequency), "yyyy-MM-dd"),
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
      reportError(error, "Unable to record recurring payment.");
    } finally {
      setSavingRecurringId("");
    }
  }

  async function handleUndoRecurringPaid() {
    if (!lastRecurringPayment) {
      reportFailure("Nothing left to undo — that payment has already been rolled back or the window expired.");
      return;
    }

    const { previousRule, transaction, updatedRule } = lastRecurringPayment;

    try {
      clearActionAlert();
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
      reportError(error, "Unable to undo recurring payment.");
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
      clearActionAlert();
      await archiveRecurringRule(ruleId);
    } catch (error) {
      setRecurringRules(previous);
      reportError(error, "Unable to delete recurring item.");
    }
  }

  async function handleDeleteGoal(goalId: string) {
    const previous = goals;
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
    if (editingGoalId === goalId) {
      setEditingGoalId("");
    }

    try {
      clearActionAlert();
      await archiveGoal(goalId);
    } catch (error) {
      setGoals(previous);
      reportError(error, "Unable to delete goal.");
    }
  }

  async function handleUpdateCategory(categoryIdToUpdate: string, input: { name: string; kind: TransactionType; monthlyBudget: string }) {
    const parsedBudget = Number(input.monthlyBudget);
    const issues = validateCategory({ action: "update this category", name: input.name, monthlyBudget: input.monthlyBudget });

    if (!issues.ok) {
      reportFailure(issues.message, issues.fix);
      return;
    }

    try {
      clearActionAlert();
      const updated = await updateCategory(categoryIdToUpdate, {
        name: input.name.trim(),
        kind: input.kind,
        monthlyBudget: input.monthlyBudget.trim() ? parsedBudget : undefined
      });
      setCategories((current) => current.map((category) => (category.id === updated.id ? updated : category)).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      reportError(error, "Unable to update category.");
    }
  }

  async function handleDeleteCategory(categoryIdToDelete: string) {
    const previousCategories = categories;
    const previousSubcategories = subcategories;
    setCategories((current) => current.filter((category) => category.id !== categoryIdToDelete));
    setSubcategories((current) => current.filter((subcategory) => subcategory.categoryId !== categoryIdToDelete));

    try {
      clearActionAlert();
      await archiveCategory(categoryIdToDelete);
    } catch (error) {
      setCategories(previousCategories);
      setSubcategories(previousSubcategories);
      reportError(error, "Unable to delete category.");
    }
  }

  async function handleUpdateSubcategory(subcategoryIdToUpdate: string, input: { categoryId: string; name: string }) {
    const issues = validateSubcategory({
      action: "update this subcategory",
      name: input.name,
      categoryId: input.categoryId,
      categoryCount: categories.length
    });

    if (!issues.ok) {
      reportFailure(issues.message, issues.fix);
      return;
    }

    try {
      clearActionAlert();
      const updated = await updateSubcategory(subcategoryIdToUpdate, {
        categoryId: input.categoryId,
        name: input.name.trim()
      });
      setSubcategories((current) => current.map((subcategory) => (subcategory.id === updated.id ? updated : subcategory)).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      reportError(error, "Unable to update subcategory.");
    }
  }

  async function handleDeleteSubcategory(subcategoryIdToDelete: string) {
    const previous = subcategories;
    setSubcategories((current) => current.filter((subcategory) => subcategory.id !== subcategoryIdToDelete));

    try {
      clearActionAlert();
      await archiveSubcategory(subcategoryIdToDelete);
    } catch (error) {
      setSubcategories(previous);
      reportError(error, "Unable to delete subcategory.");
    }
  }

  async function handleUpdateAccount(event: FormEvent<HTMLFormElement>, accountIdToUpdate: string) {
    event.preventDefault();
    const draft = accountDrafts[accountIdToUpdate];
    const parsedOpeningBalance = Number(draft?.openingBalance);
    const issues = validateAccount({
      action: "update this account",
      name: draft?.name ?? "",
      openingBalance: draft?.openingBalance ?? ""
    });

    if (!draft || !issues.ok) {
      reportFailure(issues.message || "Can't update this account yet — reopen it and try again.", issues.fix);
      return;
    }

    try {
      clearActionAlert();
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
      reportError(error, "Unable to update account.");
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
      clearActionAlert();
      await archiveAccount(accountIdToDelete);
    } catch (error) {
      setAccounts(previous);
      reportError(error, "Unable to delete account.");
    }
  }

  return {
    // demo
    demoMode: isDemoMode(),
    signUpPromptOpen,
    setSignUpPromptOpen,
    // data
    accounts,
    budgets,
    categories,
    subcategories,
    goals,
    recurringRules,
    transactions,
    balances,
    displayCategories,
    quickAddCategories,
    quickAddSubcategories,
    // shell / nav
    activeTab,
    setActiveTab,
    chooseTab,
    activeNavItem,
    mobilePrimaryNavItems,
    mobileMoreNavItems,
    mobileMoreActive,
    mobileMoreOpen,
    setMobileMoreOpen,
    language,
    setLanguage,
    theme,
    toggleTheme,
    t,
    ui,
    chart,
    isLoading,
    dataError,
    dataNotice,
    setDataNotice,
    actionAlert,
    clearActionAlert,
    reportFailure,
    formIssues,
    formAttempted,
    syncState,
    usingCachedData,
    // i18n helpers
    categoryLabel,
    frequencyLabel,
    recurringDueLabel,
    // dashboard
    dashboardStatsMonth,
    changeDashboardMonth,
    monthTotals,
    allTotals,
    currentMonthTotals,
    comparison,
    dashboardInsights,
    daily,
    budgetRows,
    dashboardCategoryMonth,
    dashboardCalendarMonth,
    setDashboardCalendarMonth,
    dashboardConcentrationMonth,
    dashboardConcentrationRows,
    dashboardCalendarDays,
    dashboardMonthSummary,
    dashboardWeekSummary,
    dashboardSelectedSummary,
    selectedDashboardDate,
    setSelectedDashboardDate,
    dailyAllowance,
    recurringDue,
    expenseForecast,
    openMonthlyCategoryReport,
    // reports
    monthlyReportMonth,
    changeMonthlyReportMonth,
    monthlyReportMode,
    setMonthlyReportMode,
    monthlyCompareMonth,
    setMonthlyCompareMonth,
    monthlyReportCategoryId,
    setMonthlyReportCategoryId,
    monthlyReportSubcategoryId,
    setMonthlyReportSubcategoryId,
    monthlyReportAccountId,
    setMonthlyReportAccountId,
    monthlyReportRecurringFilter,
    setMonthlyReportRecurringFilter,
    monthlyReportQuery,
    setMonthlyReportQuery,
    monthlyReportFiltersOpen,
    setMonthlyReportFiltersOpen,
    monthlyReportFilterCount,
    monthlyReportFilterChips,
    clearMonthlyReportFilters,
    monthlyReportSubcategories,
    monthlyReportFilteredTx,
    monthlyReportTotal,
    monthlyReportDays,
    monthlyReportActiveDays,
    monthlyReportBudgetTotal,
    monthlyReportDaily,
    monthlyReportCategoryRows,
    monthlyReportSubcategoryRows,
    monthlyReportAccountRows,
    monthlyReportTrendSeries,
    monthlyReportComparisonRows,
    monthlyComparisonCurrentTotal,
    monthlyComparisonCompareTotal,
    monthlyComparisonDelta,
    monthlyComparisonDeltaPercent,
    monthlyComparisonMaxSpend,
    // transactions
    query,
    setQuery,
    txFilterType,
    setTxFilterType,
    txFilterCategoryId,
    setTxFilterCategoryId,
    txFilterAccountId,
    setTxFilterAccountId,
    txFilterCount,
    clearTransactionFilters,
    filteredTransactions,
    type,
    setType,
    amount,
    setAmount,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    accountId,
    setAccountId,
    occurredOn,
    setOccurredOn,
    notes,
    setNotes,
    isSaving,
    handleSubmit,
    handleQuickAdd,
    quickAddOpen,
    setQuickAddOpen,
    editingTransactionId,
    startEditingTransaction,
    cancelEditingTransaction,
    transactionDrafts,
    updateTransactionDraft,
    handleUpdateTransaction,
    savingTransactionId,
    deleteTransaction,
    visibleMonth,
    setVisibleMonth,
    selectedTransactionDate,
    setSelectedTransactionDate,
    transactionCalendarDays,
    // budgets
    budgetMonth,
    setBudgetMonth,
    budgetCategoryId,
    setBudgetCategoryId,
    budgetAmount,
    setBudgetAmount,
    budgetDrafts,
    setBudgetDrafts,
    budgetTabRows,
    editingBudgetId,
    setEditingBudgetId,
    handleSetBudget,
    handleSaveBudget,
    handleDeleteBudget,
    savingBudgetId,
    // recurring
    recurringType,
    setRecurringType,
    recurringAccountId,
    setRecurringAccountId,
    recurringCategoryId,
    setRecurringCategoryId,
    recurringSubcategoryId,
    setRecurringSubcategoryId,
    recurringAmount,
    setRecurringAmount,
    recurringName,
    setRecurringName,
    recurringFrequency,
    setRecurringFrequency,
    recurringNextDueOn,
    setRecurringNextDueOn,
    recurringAutoCreate,
    setRecurringAutoCreate,
    recurringDrafts,
    setRecurringDrafts,
    handleCreateRecurring,
    handleUpdateRecurring,
    handleMarkRecurringPaid,
    handleUndoRecurringPaid,
    handleDeleteRecurring,
    editingRecurringId,
    startEditingRecurring,
    cancelEditingRecurring,
    savingRecurringId,
    undoingRecurringPaymentId,
    lastRecurringPayment,
    upcoming,
    recurringPayments,
    visibleRecurringPayments,
    displayedRecurringRules,
    recurringCalendarDays,
    selectedRecurringDate,
    setSelectedRecurringDate,
    // goals
    goalName,
    setGoalName,
    goalTargetAmount,
    setGoalTargetAmount,
    goalCurrentAmount,
    setGoalCurrentAmount,
    goalTargetDate,
    setGoalTargetDate,
    goalDrafts,
    setGoalDrafts,
    handleCreateGoal,
    handleUpdateGoal,
    handleDeleteGoal,
    editingGoalId,
    startEditingGoal,
    cancelEditingGoal,
    savingGoalId,
    // settings
    accountDrafts,
    setAccountDrafts,
    editingAccountId,
    startEditingAccount,
    cancelEditingAccount,
    handleUpdateAccount,
    handleDeleteAccount,
    savingAccountId,
    newCategoryName,
    setNewCategoryName,
    newCategoryKind,
    setNewCategoryKind,
    newCategoryBudget,
    setNewCategoryBudget,
    newSubcategoryName,
    setNewSubcategoryName,
    newSubcategoryCategoryId,
    setNewSubcategoryCategoryId,
    handleCreateCategory,
    handleCreateSubcategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory
  };
}
