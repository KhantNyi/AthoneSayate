import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subDays,
  subMonths
} from "date-fns";
import type { Account, Category, RecurringRule, Transaction, TransactionType } from "./types";

export const currency = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0
});

export const preciseCurrency = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB"
});

export function inMonth(tx: Transaction, date = new Date()) {
  const month = { start: startOfMonth(date), end: endOfMonth(date) };
  return isWithinInterval(parseISO(tx.occurredOn), month);
}

export function monthTransactions(transactions: Transaction[], date = new Date()) {
  return transactions.filter((tx) => inMonth(tx, date));
}

export function totals(transactions: Transaction[]) {
  const income = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const expenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    income,
    expenses,
    net: income - expenses,
    savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0
  };
}

export function accountBalances(accounts: Account[], transactions: Transaction[]) {
  return accounts.map((account) => {
    const txTotal = transactions
      .filter((tx) => tx.accountId === account.id)
      .reduce((sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount), 0);

    return {
      ...account,
      balance: account.openingBalance + txTotal
    };
  });
}

export function categorySpend(categories: Category[], transactions: Transaction[]) {
  return categories
    .filter((category) => category.kind === "expense")
    .map((category) => {
      const spent = transactions
        .filter((tx) => tx.categoryId === category.id && tx.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);

      return {
        ...category,
        spent,
        remaining: Math.max((category.monthlyBudget ?? 0) - spent, 0),
        progress: category.monthlyBudget ? Math.min((spent / category.monthlyBudget) * 100, 140) : 0
      };
    })
    .sort((a, b) => b.spent - a.spent);
}

export function frequentCategories(
  categories: Category[],
  transactions: Transaction[],
  type: TransactionType,
  referenceDate = new Date(),
  windowDays = 90
) {
  const today = format(referenceDate, "yyyy-MM-dd");
  const cutoff = format(subDays(referenceDate, Math.max(windowDays - 1, 0)), "yyyy-MM-dd");
  const usage = new Map<string, { count: number; latest: string }>();

  for (const transaction of transactions) {
    if (
      transaction.type !== type ||
      transaction.isRecurring ||
      transaction.recurringRuleId ||
      !transaction.categoryId ||
      transaction.occurredOn < cutoff ||
      transaction.occurredOn > today
    ) {
      continue;
    }

    const current = usage.get(transaction.categoryId) ?? { count: 0, latest: "" };
    usage.set(transaction.categoryId, {
      count: current.count + 1,
      latest: transaction.occurredOn > current.latest ? transaction.occurredOn : current.latest
    });
  }

  return categories
    .filter((category) => category.kind === type)
    .slice()
    .sort((a, b) => {
      const aUsage = usage.get(a.id) ?? { count: 0, latest: "" };
      const bUsage = usage.get(b.id) ?? { count: 0, latest: "" };
      return bUsage.count - aUsage.count || bUsage.latest.localeCompare(aUsage.latest) || a.name.localeCompare(b.name);
    });
}

export type ExpenseForecast = {
  projected: number;
  actualToDate: number;
  predictedRemaining: number;
  recurringDue: number;
  historicalBaseline: number;
  trendPercent: number | null;
  historyMonths: number;
  confidence: "low" | "medium" | "high";
};

export function forecastMonthlyExpenses(
  transactions: Transaction[],
  recurringDue: number,
  referenceDate = new Date(),
  historyMonthCount = 3
): ExpenseForecast {
  const today = format(referenceDate, "yyyy-MM-dd");
  const currentMonthStart = startOfMonth(referenceDate);
  const currentMonthStartKey = format(currentMonthStart, "yyyy-MM-dd");
  const daysInMonth = endOfMonth(referenceDate).getDate();
  const elapsedDays = Math.min(Math.max(differenceInCalendarDays(referenceDate, currentMonthStart) + 1, 1), daysInMonth);
  const remainingDays = Math.max(daysInMonth - elapsedDays, 0);
  const expenseTransactions = transactions.filter((transaction) => transaction.type === "expense");
  const trackingStart = transactions.reduce<string | null>((earliest, transaction) => (
    earliest === null || transaction.occurredOn < earliest ? transaction.occurredOn : earliest
  ), null);
  const currentExpenses = expenseTransactions.filter((transaction) => (
    transaction.occurredOn >= currentMonthStartKey && transaction.occurredOn <= today
  ));
  const actualToDate = currentExpenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const currentVariableSpend = currentExpenses
    .filter((transaction) => !transaction.isRecurring && !transaction.recurringRuleId)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const completedMonths = Array.from({ length: Math.max(historyMonthCount, 0) }, (_, index) => subMonths(currentMonthStart, index + 1))
    .filter((month) => trackingStart !== null && trackingStart <= format(startOfMonth(month), "yyyy-MM-dd"));
  const history = completedMonths.map((month, index) => {
    const monthExpenseTransactions = monthTransactions(expenseTransactions, month);
    const variableSpend = monthExpenseTransactions
      .filter((transaction) => !transaction.isRecurring && !transaction.recurringRuleId)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      total: monthExpenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      variableDailyRate: variableSpend / endOfMonth(month).getDate(),
      weight: completedMonths.length - index
    };
  });
  const totalWeight = history.reduce((sum, month) => sum + month.weight, 0);
  const historicalDailyRate = totalWeight > 0
    ? history.reduce((sum, month) => sum + month.variableDailyRate * month.weight, 0) / totalWeight
    : 0;
  const historicalBaseline = totalWeight > 0
    ? history.reduce((sum, month) => sum + month.total * month.weight, 0) / totalWeight
    : 0;
  const currentDailyRate = currentVariableSpend / elapsedDays;
  const progress = elapsedDays / daysInMonth;
  const remainingDailyRate = history.length > 0
    ? historicalDailyRate * (1 - progress) + currentDailyRate * progress
    : currentDailyRate;
  const predictedRemaining = Math.max(remainingDailyRate * remainingDays, 0);
  const projected = actualToDate + Math.max(recurringDue, 0) + predictedRemaining;
  const trendPercent = historicalBaseline > 0
    ? ((projected - historicalBaseline) / historicalBaseline) * 100
    : null;
  const confidence = history.length >= 3 && elapsedDays >= 10
    ? "high"
    : history.length >= 2 || elapsedDays >= 7
      ? "medium"
      : "low";

  return {
    projected,
    actualToDate,
    predictedRemaining,
    recurringDue: Math.max(recurringDue, 0),
    historicalBaseline,
    trendPercent,
    historyMonths: history.length,
    confidence
  };
}

export function dailySeries(transactions: Transaction[], date = new Date()) {
  const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const spent = transactions
      .filter((tx) => tx.type === "expense" && tx.occurredOn === key)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      day: format(day, "d"),
      date: key,
      spent
    };
  });
}

export function monthlyComparison(transactions: Transaction[]) {
  const current = totals(monthTransactions(transactions));
  const previous = totals(monthTransactions(transactions, subMonths(new Date(), 1)));
  const expenseDelta = previous.expenses > 0 ? ((current.expenses - previous.expenses) / previous.expenses) * 100 : 0;
  const incomeDelta = previous.income > 0 ? ((current.income - previous.income) / previous.income) * 100 : 0;

  return { current, previous, expenseDelta, incomeDelta };
}

export function upcomingRules(rules: RecurringRule[]) {
  const today = new Date();
  return rules
    .map((rule) => ({
      ...rule,
      daysUntilDue: differenceInCalendarDays(parseISO(rule.nextDueOn), today)
    }))
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export function weekdaySpend(transactions: Transaction[]) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return labels.map((label, index) => ({
    weekday: label,
    spent: transactions
      .filter((tx) => tx.type === "expense" && parseISO(tx.occurredOn).getDay() === index)
      .reduce((sum, tx) => sum + tx.amount, 0)
  }));
}

export function safeToSpend(monthlyIncome: number, monthSpend: number, recurringExpenseDue: number) {
  const remainingDays = Math.max(differenceInCalendarDays(endOfMonth(new Date()), new Date()) + 1, 1);
  return Math.max((monthlyIncome - monthSpend - recurringExpenseDue) / remainingDays, 0);
}
