import { subMonths } from "date-fns";
import { currency, monthTransactions, totals } from "@athonesayate/shared/metrics";
import type { Budget, Category, Transaction } from "@athonesayate/shared/types";

export const categoryDisplayColors = [
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

export function monthlyComparisonForMonth(transactions: Transaction[], month: Date) {
  const current = totals(monthTransactions(transactions, month));
  const previous = totals(monthTransactions(transactions, subMonths(month, 1)));

  return {
    incomeDelta: percentDelta(current.income, previous.income),
    expenseDelta: percentDelta(current.expenses, previous.expenses)
  };
}

export function percentDelta(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

export function compactCurrency(value: number) {
  if (value >= 1000000) {
    return `฿${(value / 1000000).toFixed(1)}m`;
  }

  if (value >= 1000) {
    return `฿${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return currency.format(value);
}

export function applyCategoryDisplayColors(categories: Category[]) {
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

export function applyMonthlyBudgets(categories: Category[], budgets: Budget[], month: string) {
  return categories.map((category) => {
    const budget = budgets.find((item) => item.categoryId === category.id && item.month.startsWith(month));
    return {
      ...category,
      monthlyBudget: budget?.amount ?? category.monthlyBudget
    };
  });
}

export function upsertBudgetInState(budgets: Budget[], updated: Budget) {
  const exists = budgets.some((budget) => budget.id === updated.id);

  if (exists) {
    return budgets.map((budget) => (budget.id === updated.id ? updated : budget));
  }

  return [updated, ...budgets];
}
