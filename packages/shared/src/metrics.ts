import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths
} from "date-fns";
import type { Account, Category, RecurringRule, Transaction } from "./types";

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
